import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const BASE_URL = 'http://localhost:3001/api';

async function runCheckInTest() {
  console.log('--- MEMULAI PENGUJIAN GATE SCANNER & CHECK-IN API ---\n');

  // Ambil seed data
  const seedDataPath = path.join(process.cwd(), 'prisma', 'seed-data.json');
  const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
  const { eventId, ticketCategoryId } = seedData;

  // 1. Login Customer untuk beli tiket
  console.log('[1/5] Login Customer & Checkout tiket...');
  const custRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@example.com', password: 'password123' }),
  });
  const custToken = (await custRes.json()).data.token;

  const checkoutRes = await fetch(`${BASE_URL}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${custToken}`,
    },
    body: JSON.stringify({ eventId, ticketCategoryId, quantity: 1 }),
  });
  const checkoutData: any = await checkoutRes.json();
  const orderId = checkoutData.data.order.id;
  console.log(`Order ID: ${orderId} (Status: PENDING)`);

  // 2. Login Admin (Staf Scanner)
  console.log('\n[2/5] Login Admin (Gate Scanner Staff)...');
  const adminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
  });
  const adminToken = (await adminRes.json()).data.token;

  // 3. Tes Scan Tiket yang Masih PENDING (Harus Ditolak)
  console.log('\n[3/5] Mencoba check-in tiket yang statusnya masih PENDING...');
  const pendingCheckInRes = await fetch(`${BASE_URL}/tickets/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ qrData: JSON.stringify({ orderId }) }),
  });
  const pendingCheckInData = await pendingCheckInRes.json();
  console.log(`Status HTTP: ${pendingCheckInRes.status}`, pendingCheckInData);

  // 4. Simulasi Pembayaran Sukses via Webhook (Ubah status ke PAID)
  console.log('\n[4/5] Melunasi pesanan via Webhook...');
  await fetch(`${BASE_URL}/webhook/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': 'placeholder_for_local_test',
    },
    body: JSON.stringify({ orderId, status: 'settlement' }),
  });

  // 5. Tes Scan Tiket yang sudah PAID (Harus Sukses)
  console.log('\n[5/5] Check-in Pertama (Tiket PAID - Harus Sukses)...');
  const validCheckInRes = await fetch(`${BASE_URL}/tickets/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ qrData: JSON.stringify({ orderId }) }),
  });
  const validData = await validCheckInRes.json();
  console.log(`Status HTTP Check-in 1: ${validCheckInRes.status}`, validData);

  // 6. Tes Scan Tiket Kedua Kalinya (Double Entry / Tiket Duplikat - Harus Ditolak)
  console.log('\n[Bonus] Check-in Kedua dengan Tiket yang Sama (Harus Ditolak DUPLIKAT)...');
  const duplicateCheckInRes = await fetch(`${BASE_URL}/tickets/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ qrData: JSON.stringify({ orderId }) }),
  });
  const duplicateData = await duplicateCheckInRes.json();
  console.log(`Status HTTP Check-in 2: ${duplicateCheckInRes.status}`, duplicateData);

  console.log('\n--- PENGUJIAN GATE SCANNER SELESAI ---');
}

runCheckInTest().catch(console.error);
