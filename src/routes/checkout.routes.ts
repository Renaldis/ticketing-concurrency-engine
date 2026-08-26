import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.js';

const router = Router();

router.post(
  '/checkout',
  authenticateToken as any,
  idempotencyMiddleware as any,
  CheckoutController.checkout,
);

export default router;
