import { Response, NextFunction } from 'express';
import redis from '../config/redis.js';
import { AuthenticatedRequest } from './auth.middleware.js';

export const idempotencyMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const idempotencyKey = req.header('Idempotency-Key');

  // Opsional: jika client tidak kirim header ini, skip & lanjut checkout biasa
  if (!idempotencyKey) {
    return next();
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'User authentication required' });
    return;
  }

  const redisKey = `idempotency:${userId}:${idempotencyKey}`;

  try {
    // Lock request idempotency selama proses (TTL 120 detik)
    // NX = Only set if Key Not Exists
    const lockAcquired = await redis.set(
      redisKey,
      JSON.stringify({ status: 'IN_PROGRESS' }),
      'EX',
      120,
      'NX',
    );

    if (!lockAcquired) {
      // Jika key sudah ada di Redis, baca datanya
      const existingData = await redis.get(redisKey);
      if (existingData) {
        const parsed = JSON.parse(existingData);

        if (parsed.status === 'IN_PROGRESS') {
          res.status(409).json({
            message: 'Duplicate request: Checkout is currently processing. Please wait.',
          });
          return;
        }

        if (parsed.status === 'COMPLETED') {
          // Kembalikan response yang pernah disimpan sebelumnya
          res.status(parsed.statusCode || 200).json(parsed.body);
          return;
        }
      }
    }

    // Intercept res.json untuk menyimpan response otomatis ke Redis saat controller selesai
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      // Hanya cache jika status code 2xx
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redis
          .set(
            redisKey,
            JSON.stringify({
              status: 'COMPLETED',
              statusCode: res.statusCode,
              body,
            }),
            'EX',
            86400, // TTL 24 jam
          )
          .catch((err) => console.error('[Idempotency Cache Error]:', err));
      } else {
        // Jika gagal/error, hapus lock agar user bisa retry
        redis.del(redisKey).catch((err) => console.error('[Idempotency Del Error]:', err));
      }

      return originalJson(body);
    };

    next();
  } catch (error) {
    next(error);
  }
};
