import { Request, Response } from 'express';
import { EventService } from '../services/event.service';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { uploadToR2 } from '../utils/s3-uploader';

export class EventController {
  constructor(private eventService: EventService) {}

  getAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const location = req.query.location as string;
    const category = req.query.category as string;
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc';
    const upcomingOnly = req.query.upcomingOnly !== 'false';

    const result = await this.eventService.getAllEvents({
      page,
      limit,
      search,
      location,
      category,
      sortBy,
      sortOrder,
      upcomingOnly,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const event = await this.eventService.getEventById(String(id));
    res.status(200).json({
      status: 'success',
      data: { event },
    });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { title, description, location, date, category, categories } = req.body;

    if (!title || !location || !date || !categories) {
      throw new AppError(
        'Missing required fields: title, location, date, and categories are required',
        400,
      );
    }

    // Parsing data Kategori Tiket dari request body (karena request dalam format multipart/form-data)
    let parsedCategories;
    try {
      parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
    } catch (err) {
      throw new AppError('Invalid JSON format for ticket categories', 400);
    }

    let imageUrl: string | undefined;
    if (req.file) {
      const isR2Configured =
        process.env.R2_ENDPOINT && !process.env.R2_ENDPOINT.includes('your-cloudflare-account-id');
      if (isR2Configured) {
        imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
      } else {
        console.warn('[Admin Create Event]: R2 credentials are placeholders. File upload skipped.');
        imageUrl =
          'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop';
      }
    }

    const newEvent = await this.eventService.createEvent({
      title,
      description,
      location,
      category,
      date: new Date(date),
      imageUrl,
      categories: parsedCategories,
    });
    res.status(201).json({
      status: 'success',
      message: 'Event created successfully',
      data: { event: newEvent },
    });
  });

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const updateData = req.body;
    if (req.file) {
      // jika upload gambar baru
      updateData.imageUrl = (req.file as any).location || req.file.filename;
    }
    const updatedEvent = await this.eventService.updateEvent(String(id), updateData);
    res.status(200).json({ status: 'success', data: updatedEvent });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.eventService.deleteEvent(String(id));
    res.status(200).json({ status: 'success', message: 'Event deleted successfully' });
  };

  addCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, price, capacity } = req.body;
    if (!name || price == null || capacity == null) {
      throw new AppError('Name, price, and capacity are required', 400);
    }
    const category = await this.eventService.addTicketCategory(String(id), {
      name,
      price: Number(price),
      capacity: Number(capacity),
    });
    res.status(201).json({ status: 'success', data: { category } });
  });

  adjustStock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { categoryId } = req.params;
    const { delta } = req.body;
    if (delta == null || typeof delta !== 'number') {
      throw new AppError('delta (number) is required (e.g. +10 or -5)', 400);
    }
    const updated = await this.eventService.adjustCategoryStock(String(categoryId), delta);
    res.status(200).json({ status: 'success', data: { category: updated } });
  });

  deleteCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { categoryId } = req.params;
    await this.eventService.deleteTicketCategory(String(categoryId));
    res.status(200).json({ status: 'success', message: 'Category deleted successfully' });
  });
}
