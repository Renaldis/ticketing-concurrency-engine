import { Event, Prisma } from '@prisma/client';
import prisma from '../config/prisma';

export class EventRepository {
  async findAll(
    skip: number,
    take: number,
    options: {
      search?: string;
      location?: string;
      category?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      upcomingOnly?: boolean;
    },
  ): Promise<{ events: Event[]; totalCount: number }> {
    const where: Prisma.EventWhereInput = {};

    // Filter tanggal acara: Default hanya tampilkan yang belum lewat untuk publik
    if (options.upcomingOnly) {
      where.date = { gte: new Date() };
    }

    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options.location) {
      where.location = { contains: options.location, mode: 'insensitive' };
    }

    if (options.category && options.category !== 'ALL') {
      where.category = options.category as any;
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

  async findByIdOrSlug(identifier: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    return prisma.event.findFirst({
      where: isUuid ? { OR: [{ id: identifier }, { slug: identifier }] } : { slug: identifier },
      include: {
        ticketCategories: true,
      },
    });
  }

  async findById(id: string) {
    return this.findByIdOrSlug(id);
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

  // --- TICKET CATEGORY & STOCK MANAGEMENT ---
  async addCategory(eventId: string, data: { name: string; price: number; capacity: number }) {
    return prisma.ticketCategory.create({
      data: {
        eventId,
        name: data.name,
        price: data.price,
        totalCapacity: data.capacity,
        remainingCapacity: data.capacity,
      },
    });
  }

  async updateCategoryStock(
    categoryId: string,
    delta: number, // Positif: tambah stok, Negatif: kurangi stok
  ) {
    return prisma.$transaction(async (tx) => {
      const cat = await tx.ticketCategory.findUnique({
        where: { id: categoryId },
      });
      if (!cat) throw new Error('Category not found');

      const newRemaining = cat.remainingCapacity + delta;
      const newTotal = cat.totalCapacity + delta;

      if (newRemaining < 0 || newTotal < 0) {
        throw new Error('Stock reduction exceeds available remaining capacity');
      }

      return tx.ticketCategory.update({
        where: { id: categoryId },
        data: {
          remainingCapacity: newRemaining,
          totalCapacity: newTotal,
        },
      });
    });
  }

  async deleteCategory(categoryId: string) {
    return prisma.ticketCategory.delete({
      where: { id: categoryId },
    });
  }
}
