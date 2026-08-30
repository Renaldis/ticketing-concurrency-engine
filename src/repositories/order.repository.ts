import { Order } from '@prisma/client';
import prisma from '../config/prisma';

export class OrderRepository {
  async findByUserId(userId: string): Promise<Order[]> {
    return prisma.order.findMany({
      where: { userId },
      include: {
        event: true,
        orderItems: {
          include: {
            ticketCategory: true,
          },
        },
        transaction: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdAndUserId(orderId: string, userId: string) {
    return prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        event: true,
        orderItems: {
          include: {
            ticketCategory: true,
          },
        },
        transaction: true,
      },
    });
  }
}
