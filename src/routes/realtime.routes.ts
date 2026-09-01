import { Router } from 'express';
import { RealtimeController } from '../controllers/realtime.controller.js';

const router = Router();
const realtimeController = new RealtimeController();

// SSE Stream Live Kuota Tiket Event
router.get('/realtime/events/:id/quota', realtimeController.streamEventQuota);

// SSE Stream Live Status Transaksi Pesanan
router.get('/realtime/orders/:id/status', realtimeController.streamOrderStatus);

export default router;
