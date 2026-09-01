import { Router } from 'express';
import { RealtimeController } from '../controllers/realtime.controller.js';

const router = Router();
const realtimeController = new RealtimeController();

// SSE Stream Live Kuota Tiket Event (Mendukung ID atau Slug)
router.get('/realtime/events/:id/quota', realtimeController.streamEventQuota);

// SSE Stream Live Status Transaksi Pesanan
router.get('/realtime/orders/:id/status', realtimeController.streamOrderStatus);

// SSE Stream Live Admin Telemetry & Quota
router.get('/realtime/admin/stream', realtimeController.streamAdminTelemetry);

export default router;
