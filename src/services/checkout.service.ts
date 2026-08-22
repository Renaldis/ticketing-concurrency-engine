import { Order, Prisma, TicketCategory } from '@prisma/client';
import prisma from '../config/prisma.js';

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
    // Jalankan operasi di dalam Interactive Transaction (ACID)
    return await prisma.$transaction(async (tx) => {
      // 1. Kunci baris data dengan Pessimistic Lock (SELECT FOR UPDATE)
      const categories = await tx.$queryRaw<TicketCategory[]>`
            SELECT id, "eventId", name, price, "totalCapacity", "remainingCapacity"
            FROM ticket_categories
            WHERE id = ${ticketCategoryId}
            LIMIT 1
            FOR UPDATE
            `;

      const category = categories[0];

      if (!category) {
        throw new Error('Ticket category not found');
      }

      // 2. Validasi stok sisa tiket
      const currentRemaining = Number(category.remainingCapacity);
      if (currentRemaining < quantity) {
        throw new Error(`Insufficient tickets. Remaining: ${currentRemaining}`);
      }

      // 3. Kurangi stok tiket
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

      // 4. Buat record Order
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

      // 5. Buat record Transaction status PENDING
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
  }
}
