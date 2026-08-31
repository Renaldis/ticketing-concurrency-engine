import { Order, Prisma, TicketCategory } from '@prisma/client';
import prisma from '../config/prisma.js';
import redis from '../config/redis.js';
import { orderExpirationQueue } from '../config/queue.js';
import { AppError } from '../utils/app-error.js';

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
    try {
      const savedTtl = await redis.get('system:order_expiration_ttl_minutes');
      if (savedTtl) {
        ttlMinutes = Math.max(1, parseInt(savedTtl, 10));
      }
    } catch (e) {
      console.warn('[CheckoutService]: Could not read dynamic TTL from Redis. Using default 15 mins.');
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
      const totalAmount = new Prisma.Decimal(price).mul(quantity);

      // 4. Buat Order & OrderItems
      const order = await tx.order.create({
        data: {
          userId,
          eventId,
          totalAmount,
          status: 'PENDING',
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

      // 5. Buat Record Transaction PENDING
      await tx.transaction.create({
        data: {
          orderId: order.id,
          amount: totalAmount,
          status: 'PENDING',
        },
      });

      // 6. Masukkan task penundaan kadaluarsa dinamis ke BullMQ
      console.log(`[CheckoutService]: Enqueuing expiration job for Order ${order.id} with ${ttlMinutes} mins delay`);
      await orderExpirationQueue.add('cancel-order', { orderId: order.id }, { delay: delayMs });

      return {
        order,
        ticketLeft: updatedCategory?.remainingCapacity ?? 0,
        ttlMinutes,
      };
    });
  }
}
