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

    const result = await this.eventService.getAllEvents(page, limit);
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
    const { title, description, location, date, categories } = req.body;

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
      // Jika kredensial R2 di .env masih kosong/placeholder, lewati upload agar API tidak crash
      const isR2Configured =
        process.env.R2_ENDPOINT && !process.env.R2_ENDPOINT.includes('your-cloudflare-account-id');
      if (isR2Configured) {
        imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
      } else {
        console.warn('[Admin Create Event]: R2 credentials are placeholders. File upload skipped.');
        imageUrl = 'https://via.placeholder.com/800x400.png?text=Placeholder+Poster';
      }
    }

    const newEvent = await this.eventService.createEvent({
      title,
      description,
      location,
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
}
