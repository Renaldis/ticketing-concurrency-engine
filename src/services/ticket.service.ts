import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';

export class TicketService {
  async processCheckIn(qrData: string) {
    let orderId: string;

    // 1. Ekstrak orderId dari payload QR (bisa berupa JSON stringified atau plain orderId)
    try {
      const parsed = JSON.parse(qrData);
      orderId = parsed.orderId || qrData;
    } catch {
      orderId = qrData;
    }

    // 2. Lakukan ATOMIC UPDATE hanya jika status order saat ini adalah 'PAID'
    const now = new Date();
    const updateResult = await prisma.order.updateMany({
      where: {
        id: orderId,
        status: 'PAID', // Kunci proteksi: hanya tiket lunas & belum pernah dipakai yang bisa di-update
      },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: now,
      },
    });

    // 3. Jika update gagal (count === 0), cari penyebabnya
    if (updateResult.count === 0) {
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!existingOrder) {
        throw new AppError('Invalid Ticket: Order not found', 404);
      }

      if (existingOrder.status === 'CHECKED_IN') {
        throw new AppError(
          `Ticket ALREADY USED at ${existingOrder.checkedInAt?.toISOString() || 'earlier session'}. Duplicate entry rejected!`,
          400,
        );
      }

      if (existingOrder.status === 'PENDING') {
        throw new AppError('Ticket payment is still PENDING. Not allowed to enter.', 400);
      }

      if (existingOrder.status === 'CANCELLED') {
        throw new AppError('Ticket is CANCELLED / Expired.', 400);
      }
    }

    // 4. Ambil detail tiket untuk ditampilkan di layar scanner gate
    const orderDetails = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { name: true, email: true },
        },
        event: {
          select: { title: true, location: true, date: true },
        },
        orderItems: {
          include: {
            ticketCategory: { select: { name: true } },
          },
        },
      },
    });

    return {
      orderId: orderDetails?.id,
      checkedInAt: now,
      attendee: orderDetails?.user,
      event: orderDetails?.event,
      tickets: orderDetails?.orderItems.map((item) => ({
        category: item.ticketCategory.name,
        quantity: item.quantity,
      })),
    };
  }
}
