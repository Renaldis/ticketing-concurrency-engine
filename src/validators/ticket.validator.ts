import { z } from 'zod';

export const checkInSchema = z.object({
  body: z.object({
    qrData: z.string({ message: 'qrData is required' }).min(1, 'QR Data cannot be empty'),
  }),
});
