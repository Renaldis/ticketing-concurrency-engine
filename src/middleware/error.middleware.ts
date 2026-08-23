import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // 1. Tangani Error Validasi Zod (Input Salah Format)
  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }
  // 2. Tangani Kustom AppError (Status 4xx pilihan kita)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // 3. Tangani Error Tak Terduga Lainnya (Koneksi DB Mati, Type Error, 500)
  // Stack trace hanya dicetak di terminal server, tidak dibagikan ke client luar demi keamanan
  console.error('[Internal System Error]:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error. Please try again later.',
  });
};
