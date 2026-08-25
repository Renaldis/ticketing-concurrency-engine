import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import checkoutRoutes from './routes/checkout.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import authRoutes from './routes/auth.routes.js';
import eventRoutes from './routes/event.routes.js';
import cors from 'cors';

// Nyalakan worker pemantau antrean BullMQ
import './workers/order-expiration.worker.js';
import helmet from 'helmet';
import { errorHandler } from './middleware/error.middleware.js';

// Konfigurasi dotenv agar mampu membaca file .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Pasang Middleware Global Keamanan & CORS
app.use(helmet());
app.use(cors());

// Middleware untuk mempermudah membaca body HTTP berformat JSON
app.use(express.json());

// Registrasi Route API
app.use('/api', checkoutRoutes);
app.use('/api', webhookRoutes);
app.use('/api', authRoutes);
app.use('/api', eventRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Ticketing Engine API is healthy',
  });
});

// WAJIB DI LEVEL TERBAWAH: Pasang Global Error Middleware
// Ini menangkap semua error yang dilempar dari controller kita!
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
