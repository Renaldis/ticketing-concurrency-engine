import { Event, Prisma } from '@prisma/client';
import prisma from '../config/prisma';

export class EventRepository {
  async findAll(
    skip: number,
    take: number,
    options: { search?: string; location?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' },
  ): Promise<{ events: Event[]; totalCount: number }> {
    const where: Prisma.EventWhereInput = {};

    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options.location) {
      where.location = { contains: options.location, mode: 'insensitive' };
    }

    const validSortFields = ['date', 'title', 'createdAt', 'updatedAt'];
    const sortBy = validSortFields.includes(options.sortBy || '') ? options.sortBy : 'date';
    const sortOrder = options.sortOrder === 'desc' ? 'desc' : 'asc';

    const [events, totalCount] = await prisma.$transaction([
      prisma.event.findMany({
        where,
        skip,
        take,
        include: {
          ticketCategories: true,
        },
        orderBy: {
          [sortBy as string]: sortOrder,
        },
      }),
      prisma.event.count({ where }),
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

  async update(id: string, data: Partial<Prisma.EventUpdateInput>) {
    return prisma.event.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.event.delete({
      where: { id },
    });
  }
}
