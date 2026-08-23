import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/checkout', authenticateToken as any, CheckoutController.checkout);

export default router;
