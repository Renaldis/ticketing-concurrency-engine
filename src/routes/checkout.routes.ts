import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller.js';

const router = Router();

router.post('/checkout', CheckoutController.checkout);

export default router;
