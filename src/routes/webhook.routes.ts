import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';

const router = Router();

router.post('/webhook/payment', WebhookController.handlePaymentWebhook);

export default router;
