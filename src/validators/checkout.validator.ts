import { z } from 'zod';

export const checkoutSchema = z.object({
  body: z.object({
    eventId: z.string({ message: 'eventId is required' }).uuid('Invalid eventId UUID format'),
    ticketCategoryId: z
      .string({ message: 'ticketCategoryId is required' })
      .uuid('Invalid ticketCategoryId UUID format'),
    quantity: z
      .number({ message: 'quantity is required' })
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1'),
  }),
});
