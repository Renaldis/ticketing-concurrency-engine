import { OrderRepository } from '../repositories/order.repository.js';
import { OrderStatus } from '@prisma/client';
import { AppError } from '../utils/app-error.js';

export class AdminService {
  constructor(private orderRepo: OrderRepository) {}

  async getAllOrders(params: {
    page: number;
    limit: number;
    status?: OrderStatus;
    eventId?: string;
  }) {
    const skip = (params.page - 1) * params.limit;
    const { orders, totalCount } = await this.orderRepo.findAllAdmin(skip, params.limit, {
      status: params.status,
      eventId: params.eventId,
    });

    return {
      orders,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / params.limit),
        currentPage: params.page,
        limit: params.limit,
      },
    };
  }

  async getOverallSummary() {
    const data = await this.orderRepo.getOverallAnalytics();
    const overallSoldPercentage =
      data.totalCapacity > 0 ? ((data.totalSold / data.totalCapacity) * 100).toFixed(1) : '0';

    return {
      financials: {
        totalRevenue: data.totalRevenue,
        successfulOrdersCount: data.successfulOrdersCount,
      },
      attendance: {
        checkedInAttendees: data.totalCheckedIn,
      },
      capacity: {
        totalCapacity: data.totalCapacity,
        totalSold: data.totalSold,
        totalRemaining: data.totalRemaining,
        overallSoldPercentage: `${overallSoldPercentage}%`,
      },
      metrics: {
        totalEvents: data.totalEvents,
        totalUsers: data.totalUsers,
      },
    };
  }

  async getEventSummary(eventId: string) {
    const data = await this.orderRepo.getEventAnalytics(eventId);
    if (!data) {
      throw new AppError('Event not found', 404);
    }

    const { event, totalRevenue, successfulOrdersCount, checkedInCount } = data;

    let totalCapacity = 0;
    let totalRemaining = 0;

    const categoriesBreakdown = event.ticketCategories.map((cat) => {
      const sold = cat.totalCapacity - cat.remainingCapacity;
      const percentage =
        cat.totalCapacity > 0 ? ((sold / cat.totalCapacity) * 100).toFixed(1) : '0';

      totalCapacity += cat.totalCapacity;
      totalRemaining += cat.remainingCapacity;

      return {
        id: cat.id,
        name: cat.name,
        price: cat.price,
        totalCapacity: cat.totalCapacity,
        remainingCapacity: cat.remainingCapacity,
        sold,
        soldPercentage: `${percentage}%`,
      };
    });

    const totalSold = totalCapacity - totalRemaining;
    const overallSoldPercentage =
      totalCapacity > 0 ? ((totalSold / totalCapacity) * 100).toFixed(1) : '0';

    return {
      eventId: event.id,
      title: event.title,
      location: event.location,
      date: event.date,
      financials: {
        totalRevenue,
        successfulOrdersCount,
      },
      attendance: {
        checkedInAttendees: checkedInCount,
      },
      capacity: {
        totalCapacity,
        totalSold,
        totalRemaining,
        overallSoldPercentage: `${overallSoldPercentage}%`,
      },
      categories: categoriesBreakdown,
    };
  }
}
