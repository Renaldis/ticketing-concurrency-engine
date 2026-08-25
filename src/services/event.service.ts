import { EventRepository } from '../repositories/event.repository';
import { AppError } from '../utils/app-error';

export class EventService {
  constructor(private eventRepo: EventRepository) {}

  async getAllEvents(page: number = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const take = limit;

    const { events, totalCount } = await this.eventRepo.findAll(skip, take);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      events,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  }

  async getEventById(id: string) {
    const event = await this.eventRepo.findById(id);
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    return event;
  }

  // Logika pembuatan Event Baru beserta Kategori Tiket bawaannya
  async createEvent(eventData: {
    title: string;
    description?: string;
    location: string;
    date: Date;
    imageUrl?: string;
    categories: Array<{ name: string; price: number; capacity: number }>;
  }) {
    if (!eventData.categories || eventData.categories.length === 0) {
      throw new AppError('At least one ticket category is required to create an event', 400);
    }
    const newEvent = await this.eventRepo.create({
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      date: eventData.date,
      imageUrl: eventData.imageUrl,
      ticketCategories: {
        create: eventData.categories.map((cat) => ({
          name: cat.name,
          price: cat.price,
          totalCapacity: cat.capacity,
          remainingCapacity: cat.capacity, // Kapasitas sisa disamakan dengan kapasitas awal
        })),
      },
    });
    return newEvent;
  }
}
