import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { checkoutSchema } from '../validators/checkout.validator.js';
import { createRateLimiter } from '../middleware/rate-limiter.middleware.js';

const router = Router();

const checkoutLimiter = createRateLimiter({
  windowMs: 10 * 1000,
  maxRequests: 3,
  keyPrefix: 'checkout',
});

const checkoutController = new CheckoutController();

router.post(
  '/checkout',
  authenticateToken as any,
  idempotencyMiddleware as any,
  checkoutLimiter as any,
  validate(checkoutSchema) as any,
  checkoutController.checkout,
);

export default router;
