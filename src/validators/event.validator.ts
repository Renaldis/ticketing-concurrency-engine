import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    title: z
      .string({ message: 'title is required' })
      .min(3, 'Title must be at least 3 characters long'),
    description: z.string().optional(),
    category: z.enum(['CONCERT', 'SPORTS', 'SEMINAR', 'WEBINAR', 'EXHIBITION', 'WORKSHOP', 'FESTIVAL']).optional(),
    location: z
      .string({ message: 'location is required' })
      .min(3, 'Location must be at least 3 characters long'),
    date: z
      .string({ message: 'date is required' })
      .datetime('Date must be a valid ISO 8601 string'),
    categories: z.union([
      z.array(
        z.object({
          name: z.string().min(1),
          price: z.number().positive(),
          capacity: z.number().int().positive(),
        }),
      ),
      z.string().refine((val) => {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) && parsed.length > 0;
        } catch {
          return false;
        }
      }, 'Categories string must be a valid JSON array'),
    ]),
  }),
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Event identifier is required'),
  }),
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    category: z.enum(['CONCERT', 'SPORTS', 'SEMINAR', 'WEBINAR', 'EXHIBITION', 'WORKSHOP', 'FESTIVAL']).optional(),
    location: z.string().min(3).optional(),
    date: z.string().datetime().optional(),
  }),
});
