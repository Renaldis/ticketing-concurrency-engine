import { OrderRepository } from '../repositories/order.repository.js';
import { AppError } from '../utils/app-error.js';
import QRCode from 'qrcode';
import { createMidtransSnapTransaction, getMidtransTransactionStatus } from '../utils/midtrans.js';
import prisma from '../config/prisma.js';
import redis from '../config/redis.js';
import { RealtimeBroadcaster } from '../utils/realtime-broadcaster.js';

export class OrderService {
  constructor(private orderRepo: OrderRepository) {}

  async getUserOrders(userId: string) {
    return this.orderRepo.findByUserId(userId);
  }

  // --- RESUME PAYMENT (DAPATKAN KEMBALI SNAP TOKEN UNTUK ORDER PENDING) ---
  async getPaymentToken(orderId: string, userId: string) {
    const order = await this.orderRepo.findByIdAndUserId(orderId, userId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status === 'PAID' || order.status === 'CHECKED_IN') {
      throw new AppError('Order has already been paid and settled.', 400);
    }

    if (order.status === 'CANCELLED') {
      throw new AppError('Order has expired or been cancelled. Please book a new ticket.', 400);
    }

    // Jika snapToken sudah tersimpan di database transaksi, langsung kembalikan
    if (order.transaction?.snapToken) {
      return {
        orderId: order.id,
        amount: order.totalAmount,
        token: order.transaction.snapToken,
        redirectUrl: order.transaction.snapRedirectUrl,
      };
    }

    // Jika belum ada, buatkan Snap Token baru
    const user = await prisma.user.findUnique({ where: { id: userId } });
    let ttlMinutes = 15;
    try {
      const savedTtl = await redis.get('system:order_expiration_ttl_minutes');
      if (savedTtl) ttlMinutes = parseInt(savedTtl, 10);
    } catch {
      // Fallback to default
    }

    const snapResult = await createMidtransSnapTransaction({
      orderId: order.id,
      grossAmount: Number(order.totalAmount),
      expiryMinutes: ttlMinutes,
      customerDetails: {
        name: user?.name || 'Customer',
        email: user?.email || 'customer@example.com',
      },
    });

    const token = snapResult?.token || 'mock-midtrans-snap-token-resume';
    const redirectUrl =
      snapResult?.redirect_url || 'https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-token';

    await prisma.transaction.update({
      where: { orderId: order.id },
      data: { snapToken: token, snapRedirectUrl: redirectUrl },
    });

    return {
      orderId: order.id,
      amount: order.totalAmount,
      token,
      redirectUrl,
    };
  }

  // --- MANUAL CANCEL ORDER (USER MEMBATALKAN PESANAN SECARA MANUAL) ---
  async cancelUserOrder(orderId: string, userId: string) {
    let targetEventId: string | null = null;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId },
        include: { orderItems: true },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.status !== 'PENDING') {
        throw new AppError(`Cannot cancel order with status ${order.status}`, 400);
      }

      targetEventId = order.eventId;

      // Update order status ke CANCELLED & transaction ke FAILED
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      await tx.transaction.update({
        where: { orderId },
        data: { status: 'FAILED' },
      });

      // Kembalikan kapasitas stok tiket secara atomic
      for (const item of order.orderItems) {
        await tx.ticketCategory.update({
          where: { id: item.ticketCategoryId },
          data: {
            remainingCapacity: { increment: item.quantity },
          },
        });
      }

      return { message: 'Order successfully cancelled and tickets restocked' };
    });

    // Broadcast pengembalian kuota & perubahan status SETELAH DB transaksi COMMIT
    if (targetEventId) {
      RealtimeBroadcaster.broadcastEventQuota(targetEventId).catch((e) => {
        console.error('[cancelUserOrder Realtime Error]:', e);
      });
    }
    RealtimeBroadcaster.broadcastOrderStatus(orderId, 'CANCELLED').catch((e) => {
      console.error('[cancelUserOrder Realtime Status Error]:', e);
    });

    return result;
  }

  async syncOrderStatus(orderId: string, userId: string) {
    const order = await this.orderRepo.findByIdAndUserId(orderId, userId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Jika sudah PAID / CHECKED_IN, kembalikan data terkini
    if (order.status === 'PAID' || order.status === 'CHECKED_IN') {
      return order;
    }

    // Query status langsung ke Midtrans API
    const midtransData = await getMidtransTransactionStatus(orderId);
    if (!midtransData) {
      return order;
    }

    const txStatus = midtransData.transaction_status;
    const fraudStatus = midtransData.fraud_status;

    const isSettlement =
      txStatus === 'settlement' || (txStatus === 'capture' && fraudStatus === 'accept');

    if (isSettlement) {
      await prisma.$transaction(async (tx) => {
        // Cek apakah sebelumnya CANCELLED -> Smart Auto-Recovery
        if (order.status === 'CANCELLED') {
          for (const item of order.orderItems) {
            const updateResult = await tx.ticketCategory.updateMany({
              where: {
                id: item.ticketCategoryId,
                remainingCapacity: { gte: item.quantity },
              },
              data: {
                remainingCapacity: { decrement: item.quantity },
              },
            });

            if (updateResult.count === 0) {
              console.warn(
                `[syncStatus Auto-Recovery]: Kuota tiket untuk kategori ${item.ticketCategoryId} habis!`,
              );
              await tx.transaction.update({
                where: { orderId },
                data: { status: 'FAILED' },
              });
              return;
            }
          }
        }

        await tx.order.update({
          where: { id: orderId },
          data: { status: 'PAID' },
        });

        await tx.transaction.update({
          where: { orderId },
          data: { status: 'SUCCESS' },
        });
      });
    }

    return this.orderRepo.findByIdAndUserId(orderId, userId);
  }

  async getEticket(orderId: string, userId: string) {
    const order = await this.orderRepo.findByIdAndUserId(orderId, userId);

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status !== 'PAID') {
      throw new AppError(
        `E-Ticket is only available for PAID orders. Current status: ${order.status}`,
        400,
      );
    }

    // Payload QR Code yang akan di-scan saat check-in pintu konser
    const qrPayload = JSON.stringify({
      orderId: order.id,
      userId: order.userId,
      eventId: order.eventId,
      status: order.status,
    });

    // Generate Base64 Data URL untuk QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

    return {
      orderId: order.id,
      status: order.status,
      event: {
        id: order.event.id,
        title: order.event.title,
        location: order.event.location,
        date: order.event.date,
      },
      items: order.orderItems.map((item) => ({
        ticketCategory: item.ticketCategory.name,
        quantity: item.quantity,
        price: item.price,
      })),
      qrCode: qrCodeDataUrl,
    };
  }
}
