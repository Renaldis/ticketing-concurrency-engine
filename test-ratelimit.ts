import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:3001/api';

async function runRateLimitTest() {
  console.log('--- MEMULAI PENGUJIAN RATE LIMITING ---\n');

  const dummyEmail = `ratelimit_user_${Date.now()}@example.com`;

  console.log('[1/1] Menguji Rate Limiter Login (Max 5 req/menit per IP)...');
  for (let i = 1; i <= 6; i++) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: dummyEmail, password: 'password123' }),
    });
    const data: any = await res.json();
    console.log(
      `Request #${i} -> Status HTTP: ${res.status}`,
      res.status === 429 ? JSON.stringify(data) : `(${data.message})`,
    );
  }

  console.log('\n--- PENGUJIAN RATE LIMIT SELESAI ---');
}

runRateLimitTest().catch(console.error);
