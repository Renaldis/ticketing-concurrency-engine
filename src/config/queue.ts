import { Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL is not defined');
}

// Opsi koneksi Redis khusus untuk BullMQ
export const queueConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // WAJIB diset null agar BullMQ tidak melempar error link crash
});

// Daftarkan antrean baru bernama 'order-expiration'
export const orderExpirationQueue = new Queue('order-expiration', {
  connection: queueConnection,
});
