import { Router, Request, Response } from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';

const router = Router();

const webhookController = new WebhookController();

// Method POST untuk Notifikasi Webhook resmi Midtrans/Server-to-Server
router.post('/webhook/payment', webhookController.handlePaymentWebhook);
router.post('/webhooks/payment', webhookController.handlePaymentWebhook);

// Method GET Safety Handler jika Midtrans Finish URL mengarahkan browser pengguna secara keliru ke backend webhook
const handleGetRedirect = (req: Request, res: Response) => {
  const orderId = (req.query.order_id || req.query.orderId) as string;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const targetUrl = orderId
    ? `${frontendUrl}/my-orders?order_id=${orderId}`
    : `${frontendUrl}/my-orders`;
  res.redirect(302, targetUrl);
};

router.get('/webhook/payment', handleGetRedirect);
router.get('/webhooks/payment', handleGetRedirect);

export default router;
