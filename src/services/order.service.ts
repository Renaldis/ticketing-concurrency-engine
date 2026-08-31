import { OrderRepository } from '../repositories/order.repository.js';
import { AppError } from '../utils/app-error.js';
import QRCode from 'qrcode';
import { getMidtransTransactionStatus } from '../utils/midtrans.js';
import prisma from '../config/prisma.js';

export class OrderService {
  constructor(private orderRepo: OrderRepository) {}

  async getUserOrders(userId: string) {
    return this.orderRepo.findByUserId(userId);
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

    let isSettlement =
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
