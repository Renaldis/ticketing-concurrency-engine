import { Response, NextFunction } from 'express';
import redis from '../config/redis.js';
import { AuthenticatedRequest } from './auth.middleware.js';

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export const createRateLimiter = (options: RateLimiterOptions) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const identifier = req.user?.id || req.ip || 'unknown';
    const key = `ratelimit:${options.keyPrefix}:${identifier}`;
    const windowSec = Math.ceil(options.windowMs / 1000);

    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSec);
      }

      if (current > options.maxRequests) {
        const ttl = await redis.ttl(key);
        res.status(429).json({
          status: 'error',
          message: `Too many requests. Please try again in ${ttl > 0 ? ttl : windowSec} seconds.`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('[RateLimiter Error]:', error);
      next();
    }
  };
};
