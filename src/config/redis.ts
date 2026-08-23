import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL is not defined in the environment variables');
}

// Inisialisasi klien Redis (Singleton Pattern)
const redis = new Redis(redisUrl);

redis.on('connect', () => {
  console.log('[redis]: Connected successfully to Redis Cache');
});

redis.on('error', (err) => {
  console.error('[redis]: Connection error:', err);
});
export default redis;
