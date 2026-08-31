import { Order, OrderStatus, Prisma } from '@prisma/client';
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

  async findAllAdmin(
    skip: number,
    take: number,
    filters: { status?: OrderStatus; eventId?: string },
  ) {
    const where: Prisma.OrderWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.eventId) where.eventId = filters.eventId;

    const [orders, totalCount] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          user: { select: { id: true, name: true, email: true } },
          event: { select: { id: true, title: true, location: true, date: true } },
          orderItems: { include: { ticketCategory: true } },
          transaction: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, totalCount };
  }

  async getOverallAnalytics() {
    // 1. Total Revenue dari seluruh order berstatus PAID dan CHECKED_IN
    const revenueAggregation = await prisma.order.aggregate({
      where: {
        status: { in: ['PAID', 'CHECKED_IN'] },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // 2. Total Gate Checked In di seluruh event
    const totalCheckedIn = await prisma.order.count({
      where: {
        status: 'CHECKED_IN',
      },
    });

    // 3. Agregasi kapasitas dan tiket terjual dari seluruh kategori tiket
    const allCategories = await prisma.ticketCategory.findMany({
      include: {
        event: {
          select: { title: true },
        },
      },
    });

    let totalCapacity = 0;
    let totalRemaining = 0;

    for (const cat of allCategories) {
      totalCapacity += cat.totalCapacity;
      totalRemaining += cat.remainingCapacity;
    }

    const totalSold = totalCapacity - totalRemaining;
    const totalEvents = await prisma.event.count();
    const totalUsers = await prisma.user.count();

    return {
      totalRevenue: revenueAggregation._sum.totalAmount || 0,
      successfulOrdersCount: revenueAggregation._count.id,
      totalCheckedIn,
      totalCapacity,
      totalSold,
      totalRemaining,
      totalEvents,
      totalUsers,
    };
  }

  async getEventAnalytics(eventId: string) {
    // 1. Ambil detail Event beserta Kategori Tiket
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketCategories: true },
    });

    if (!event) return null;

    // 2. Hitung total revenue dari Order berstatus PAID dan CHECKED_IN
    const revenueAggregation = await prisma.order.aggregate({
      where: {
        eventId,
        status: { in: ['PAID', 'CHECKED_IN'] },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // 3. Hitung jumlah pengunjung yang sudah scan masuk di gate (CHECKED_IN)
    const checkedInOrdersCount = await prisma.order.count({
      where: {
        eventId,
        status: 'CHECKED_IN',
      },
    });

    return {
      event,
      totalRevenue: revenueAggregation._sum.totalAmount || 0,
      successfulOrdersCount: revenueAggregation._count.id,
      checkedInCount: checkedInOrdersCount,
    };
  }
}
