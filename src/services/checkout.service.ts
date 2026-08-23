import { Order, Prisma, TicketCategory } from '@prisma/client';
import prisma from '../config/prisma.js';
import { LockManager } from '../utils/lock-manager.js';

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
}

export class CheckoutService {
  static async executeCheckout(
    userId: string,
    eventId: string,
    ticketCategoryId: string,
    quantity: number,
  ): Promise<CheckoutResponse> {
    // LANGKAH 1: Dapatkan lock dari Redis untuk kategori tiket ini
    // Kita berikan TTL 3000ms (3 detik) - cukup untuk memproses transaksi SQL
    // Mencoba 15 kali percobaan dengan jeda 50ms (total ~750ms waktu tunggu)
    const lockToken = await LockManager.acquireLockWithRetry(ticketCategoryId, 3000, 15, 50);

    if (!lockToken) {
      throw new Error('Server is busy processing checkouts. Please try again in a moment.');
    }

    try {
      // LANGKAH 2: Jalankan operasi database di dalam Interactive Transaction (ACID)
      // Karena kita sudah mengunci di Redis, query database di sini dijamin berurutan (sequential)
      return await prisma.$transaction(async (tx) => {
        // Kita tetap menggunakan query biasa di DB (tidak wajib FOR UPDATE lagi karena sudah dijaga Redis)
        const category = await tx.ticketCategory.findUnique({
          where: { id: ticketCategoryId },
        });

        if (!category) {
          throw new Error('Ticket category not found');
        }

        // Validasi stok sisa tiket
        const currentRemaining = Number(category.remainingCapacity);
        if (currentRemaining < quantity) {
          throw new Error(`Insufficient tickets. Remaining: ${currentRemaining}`);
        }

        // Kurangi stok tiket
        const updatedCategory = await tx.ticketCategory.update({
          where: { id: ticketCategoryId },
          data: {
            remainingCapacity: {
              decrement: quantity,
            },
          },
        });

        // Ambil nilai harga dalam tipe Decimal bawaan Prisma
        const price = category.price;
        // Hitung total bayar menggunakan perkalian presisi Decimal
        const totalAmount = new Prisma.Decimal(price).mul(quantity);

        // Buat record Order
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

        // Buat record Transaction status PENDING
        await tx.transaction.create({
          data: {
            orderId: order.id,
            amount: totalAmount,
            status: 'PENDING',
          },
        });

        return {
          order,
          ticketLeft: updatedCategory.remainingCapacity,
        };
      });
    } finally {
      // LANGKAH 3: Lepaskan kunci Redis di blok 'finally' agar PASTI dilepas selesai transaksi
      await LockManager.releaseLock(ticketCategoryId, lockToken);
    }
  }
}
