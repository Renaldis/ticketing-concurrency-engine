import { Event, Prisma } from '@prisma/client';
import prisma from '../config/prisma';

export class EventRepository {
  async findAll(skip: number, take: number): Promise<{ events: Event[]; totalCount: number }> {
    const [events, totalCount] = await prisma.$transaction([
      prisma.event.findMany({
        skip,
        take,
        include: {
          ticketCategories: true,
        },
        orderBy: {
          date: 'asc',
        },
      }),
      prisma.event.count(),
    ]);

    return { events, totalCount };
  }

  async findById(id: string) {
    return prisma.event.findUnique({
      where: { id },
      include: {
        ticketCategories: true,
      },
    });
  }

  async create(data: Prisma.EventCreateInput) {
    return prisma.event.create({
      data,
      include: {
        ticketCategories: true,
      },
    });
  }
}
