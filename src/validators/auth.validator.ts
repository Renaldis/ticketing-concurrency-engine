import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string({ message: 'Email is required' }).email('Invalid email format'),
    password: z
      .string({ message: 'Password is required' })
      .min(6, 'Password must be at least 6 characters long'),
    name: z.string().optional(),
  }),
});
export const loginSchema = z.object({
  body: z.object({
    email: z.string({ message: 'Email is required' }).email('Invalid email format'),
    password: z.string({ message: 'Password is required' }),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z
      .string({ message: 'Name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string({ message: 'Current password is required' }),
    newPassword: z
      .string({ message: 'New password is required' })
      .min(6, 'New password must be at least 6 characters long'),
  }),
});
