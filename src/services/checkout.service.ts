import { Order, Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import redis from '../config/redis.js';
import { orderExpirationQueue } from '../config/queue.js';
import { AppError } from '../utils/app-error.js';
import { RealtimeBroadcaster } from '../utils/realtime-broadcaster.js';

// Definisikan tipe untuk response sukses checkout
interface CheckoutResponse {
  order: Order & {
    orderItems: {
      id: string;
      orderId: string;
      ticketCategoryId: string;
      quantity: number;
      price: Prisma.Decimal;
    }[];
  };
  ticketLeft: number;
  ttlMinutes: number;
}

export class CheckoutService {
  static async executeCheckout(
    userId: string,
    eventId: string,
    ticketCategoryId: string,
    quantity: number,
  ): Promise<CheckoutResponse> {
    // Ambil konfigurasi TTL kedaluwarsa dinamis dari Redis (Default 15 menit jika belum diset)
    let ttlMinutes = 15;
    let feePercent = 2; // Default 2%
    try {
      const [savedTtl, savedFee] = await Promise.all([
        redis.get('system:order_expiration_ttl_minutes'),
        redis.get('system:platform_fee_percent'),
      ]);
      if (savedTtl) {
        ttlMinutes = Math.max(1, parseInt(savedTtl, 10));
      }
      if (savedFee) {
        feePercent = Math.max(0, parseFloat(savedFee));
      }
    } catch (e) {
      console.warn(
        '[CheckoutService]: Could not read dynamic settings from Redis. Using defaults.',
      );
    }
    const delayMs = ttlMinutes * 60 * 1000;

    // Operasi dikemas dalam transaksi DB ACID tanpa butuh Redis Lock
    return await prisma.$transaction(async (tx) => {
      // 1. Ambil data kategori tiket untuk mengetahui harga & validasi keberadaan
      const category = await tx.ticketCategory.findUnique({
        where: { id: ticketCategoryId },
      });

      if (!category) {
        throw new AppError('Ticket category not found', 404);
      }

      // 2. ATOMIC DECREMENT pada Postgres level SQL query:
      // Hanya kurangi jika remainingCapacity >= quantity (Menjamin tidak pernah minus / oversold)
      const updateResult = await tx.ticketCategory.updateMany({
        where: {
          id: ticketCategoryId,
          remainingCapacity: {
            gte: quantity,
          },
        },
        data: {
          remainingCapacity: {
            decrement: quantity,
          },
        },
      });

      // Jika tidak ada baris yang ter-update (count === 0), artinya stok tiket tidak cukup
      if (updateResult.count === 0) {
        throw new AppError(`Insufficient tickets available for purchase`, 400);
      }

      // 3. Ambil sisa stok terbaru setelah Atomic Decrement
      const updatedCategory = await tx.ticketCategory.findUnique({
        where: { id: ticketCategoryId },
        select: { remainingCapacity: true },
      });

      const price = category.price;
      const rawSubtotal = new Prisma.Decimal(price).mul(quantity);

      // Cek apakah tiket gratis (Rp 0)
      const isFree = rawSubtotal.equals(0);

      // Hitung biaya platform resmi (jika berbayar)
      let totalAmount = new Prisma.Decimal(0);

      if (!isFree) {
        const platformFee = rawSubtotal
          .mul(feePercent)
          .div(100)
          .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
        totalAmount = rawSubtotal.add(platformFee);
      }

      const orderStatus = isFree ? 'PAID' : 'PENDING';
      const transactionStatus = isFree ? 'SUCCESS' : 'PENDING';
      const paymentMethod = isFree ? 'FREE_REGISTRATION' : undefined;

      // 4. Buat Record Order
      const order = await tx.order.create({
        data: {
          userId,
          eventId,
          totalAmount,
          status: orderStatus,
          orderItems: {
            create: {
              ticketCategoryId,
              quantity,
              price,
            },
          },
        },
        include: {
          orderItems: true,
        },
      });

      // 5. Buat Record Transaction
      await tx.transaction.create({
        data: {
          orderId: order.id,
          amount: totalAmount,
          status: transactionStatus,
          paymentMethod,
        },
      });

      // 6. Jika berbayar, daftarkan countdown kadaluarsa ke BullMQ. Jika gratis, skip!
      if (!isFree) {
        console.log(
          `[CheckoutService]: Enqueuing expiration job for Order ${order.id} with ${ttlMinutes} mins delay`,
        );
        await orderExpirationQueue.add('cancel-order', { orderId: order.id }, { delay: delayMs });
      } else {
        console.log(
          `[CheckoutService]: Free pass claimed for Order ${order.id}. Auto-settled to PAID.`,
        );
      }

      // Trigger realtime broadcast sisa kuota tiket
      RealtimeBroadcaster.broadcastEventQuota(eventId).catch(() => {});

      return {
        order,
        ticketLeft: updatedCategory?.remainingCapacity ?? 0,
        ttlMinutes,
      };
    });
  }
}
