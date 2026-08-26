import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const BASE_URL = 'http://localhost:3001/api';

async function runIdempotencyTest() {
  console.log('--- MEMULAI PENGUJIAN IDEMPOTENCY KEY CHECKOUT ---\n');

  // Ambil seed data
  const seedDataPath = path.join(process.cwd(), 'prisma', 'seed-data.json');
  if (!fs.existsSync(seedDataPath)) {
    console.error('Error: Lakukan "npx prisma db seed" terlebih dahulu!');
    process.exit(1);
  }
  const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
  const { eventId, ticketCategoryId } = seedData;

  // 1. Login untuk dapat token
  console.log('[1/4] Login user untuk dapat token...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@example.com', password: 'password123' }),
  });
  const loginData: any = await loginRes.json();
  const token = loginData.data?.token;

  if (!token) {
    console.error('Gagal login:', loginData);
    process.exit(1);
  }
  console.log('Login sukses.');

  const idempotencyKey = `test-key-${Date.now()}`;
  const checkoutPayload = { eventId, ticketCategoryId, quantity: 1 };

  // 2. Request Pertama dengan Idempotency Key
  console.log(`\n[2/4] Mengirim Checkout 1 (Idempotency-Key: ${idempotencyKey})...`);
  const res1 = await fetch(`${BASE_URL}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(checkoutPayload),
  });
  const data1: any = await res1.json();
  console.log(`Status HTTP Checkout 1: ${res1.status}`);
  console.log('Response Checkout 1:', JSON.stringify(data1, null, 2));

  // 3. Request Kedua dengan Idempotency Key yang SAMA (Duplicate / Retry)
  console.log(`\n[3/4] Mengirim Checkout 2 (Idempotency-Key SAMA: ${idempotencyKey})...`);
  const res2 = await fetch(`${BASE_URL}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(checkoutPayload),
  });
  const data2: any = await res2.json();
  console.log(`Status HTTP Checkout 2: ${res2.status}`);
  console.log('Response Checkout 2 (Cached Response):', JSON.stringify(data2, null, 2));

  // Verify Idempotency Result
  if (res1.status === 201 && (res2.status === 201 || res2.status === 200) && data1.data?.order?.id === data2.data?.order?.id) {
    console.log('\n[SUCCESS] Idempotency Key Berhasil! Order ID bernilai sama tanpa duplikasi di DB.');
  } else {
    console.log('\n[FAIL] Idempotency Key belum bekerja sesuai ekspektasi.');
  }

  // 4. Request Ketiga dengan Idempotency Key BARU
  const newKey = `test-key-new-${Date.now()}`;
  console.log(`\n[4/4] Mengirim Checkout 3 (Idempotency-Key BARU: ${newKey})...`);
  const res3 = await fetch(`${BASE_URL}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${token}`,
      'Idempotency-Key': newKey,
    },
    body: JSON.stringify(checkoutPayload),
  });
  const data3: any = await res3.json();
  console.log(`Status HTTP Checkout 3: ${res3.status}`);
  console.log('Response Checkout 3 (Order Baru):', JSON.stringify(data3, null, 2));

  console.log('\n--- PENGUJIAN IDEMPOTENCY SELESAI ---');
}

runIdempotencyTest().catch(console.error);
