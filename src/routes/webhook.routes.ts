import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';

const router = Router();

const webhookController = new WebhookController();

router.post('/webhook/payment', webhookController.handlePaymentWebhook);
router.post('/webhooks/payment', webhookController.handlePaymentWebhook);

export default router;
