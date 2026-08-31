import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const BASE_URL = 'http://localhost:3001/api';

async function testResumePayment() {
  console.log('--- MEMULAI PENGUJIAN RESUME PAYMENT & ORDER CANCELLATION ---\n');

  // Ambil seed data
  const seedDataPath = path.join(process.cwd(), 'prisma', 'seed-data.json');
  const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
  const { eventId, ticketCategoryId } = seedData;

  // 1. Login user
  console.log('[1/4] Login user Customer...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@example.com', password: 'password123' }),
  });
  const token = (await loginRes.json()).data.token;

  // 2. Checkout tiket baru (Status PENDING)
  console.log('\n[2/4] Checkout Tiket (Status PENDING)...');

  const eventsRes = await fetch(`${BASE_URL}/events`);
  const eventsData = await eventsRes.json();
  const activeEvent = eventsData.data?.events[0];
  const activeCat = activeEvent?.ticketCategories[0];
  console.log(`Using Event: ${activeEvent?.id}, Category: ${activeCat?.id}`);

  const checkoutRes = await fetch(`${BASE_URL}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${token}`,
      'Idempotency-Key': `resume-test-${Date.now()}`,
    },
    body: JSON.stringify({
      eventId: activeEvent.id,
      ticketCategoryId: activeCat.id,
      quantity: 1,
    }),
  });
  const checkoutData: any = await checkoutRes.json();
  console.log('HTTP Status:', checkoutRes.status, 'Response:', checkoutData);
  const orderId = checkoutData.data?.order?.id;
  console.log(`Order ID: ${orderId} (Status: PENDING)`);

  // 3. Menguji Resume Payment (POST /orders/:id/pay)
  console.log(`\n[3/4] Mengambil kembali Snap Token untuk Order ${orderId} (POST /orders/:id/pay)...`);
  const resumeRes = await fetch(`${BASE_URL}/orders/${orderId}/pay`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
  const resumeData: any = await resumeRes.json();
  console.log(`Status HTTP: ${resumeRes.status}`);
  console.log('Payment Resume Response:', JSON.stringify(resumeData.data?.payment, null, 2));

  // 4. Menguji Pembatalan Manual Pesanan (POST /orders/:id/cancel)
  console.log(`\n[4/4] Membatalkan Pesanan secara Manual (POST /orders/:id/cancel)...`);
  const cancelRes = await fetch(`${BASE_URL}/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
  const cancelData: any = await cancelRes.json();
  console.log(`Status HTTP: ${cancelRes.status}`);
  console.log('Cancel Response:', cancelData.message);

  console.log('\n--- PENGUJIAN SELESAI ---');
}

testResumePayment().catch(console.error);
