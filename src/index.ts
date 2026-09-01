import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import swaggerUi from 'swagger-ui-express';

import checkoutRoutes from './routes/checkout.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import authRoutes from './routes/auth.routes.js';
import eventRoutes from './routes/event.routes.js';
import orderRoutes from './routes/order.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import adminRoutes from './routes/admin.routes.js';
import realtimeRoutes from './routes/realtime.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

// Nyalakan worker pemantau antrean BullMQ
import './workers/order-expiration.worker.js';

// Konfigurasi dotenv agar mampu membaca file .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Pasang Middleware Global Keamanan & CORS
// Matikan CSP bawaan helmet agar inline CSS/JS milik Swagger UI terload dengan sukses
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(cors());

// Middleware untuk mempermudah membaca body HTTP berformat JSON
app.use(express.json());

// Load dan parse data API spesifikasi swagger.yaml
const swaggerFile = fs.readFileSync(path.join(process.cwd(), 'swagger.yaml'), 'utf8');
const swaggerDocument = YAML.parse(swaggerFile);

// Daftarkan route Swagger UI di /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

import redis from './config/redis.js';

app.use('/api', realtimeRoutes);
// Endpoint publik untuk membaca konfigurasi persentase fee aktif
app.get('/api/settings/fee', async (req: Request, res: Response) => {
  try {
    const fee = (await redis.get('system:platform_fee_percent')) || '2';
    res.json({ status: 'success', data: { feePercent: parseFloat(fee) } });
  } catch {
    res.json({ status: 'success', data: { feePercent: 2 } });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Ticketing Engine API is healthy',
  });
});

// Registrasi Route API
app.use('/api', checkoutRoutes);
app.use('/api', webhookRoutes);
app.use('/api', authRoutes);
app.use('/api', eventRoutes);
app.use('/api', orderRoutes);
app.use('/api', ticketRoutes);
app.use('/api', adminRoutes);

// WAJIB DI LEVEL TERBAWAH: Pasang Global Error Middleware
// Ini menangkap semua error yang dilempar dari controller kita!
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Swagger documentation is available at http://localhost:${PORT}/api-docs`);
});
