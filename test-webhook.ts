import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const API_URL = 'http://localhost:3001/api';
const secret = process.env.WEBHOOK_SECRET || 'my_super_secret_webhook_token_2026';

// Fungsi helper untuk men-generate HMAC SHA256 signature
function generateSignature(payload: any, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(JSON.stringify(payload)).digest('hex');
}

async function testWebhook() {
  console.log('--- MEMULAI PENGUJIAN WEBHOOK & HMAC ---');

  // Baca ID otomatis dari file seed-data.json
  const seedDataPath = path.join(process.cwd(), 'prisma', 'seed-data.json');
  if (!fs.existsSync(seedDataPath)) {
    console.error('Error: lakukan "npx prisma db seed" terlebih dahulu!');
    process.exit(1);
  }
  const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

  // 1. BUAT KASUS: CHECKOUT ORDER BARU (PENDING)
  console.log('\n[1/4] Mendaftarkan checkout tiket (Order PENDING)...');

  // Login dulu untuk mendapatkan JWT Token
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@example.com', password: 'password123' }),
  });
  const loginData: any = await loginRes.json();
  const token = loginData.data?.token;

  const checkoutPayload = {
    eventId: seedData.eventId,
    ticketCategoryId: seedData.ticketCategoryId,
    quantity: 1,
  };

  const checkoutRes = await fetch(`${API_URL}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(checkoutPayload),
  });

  const checkoutData: any = await checkoutRes.json();
  if (checkoutRes.status !== 201) {
    console.error('Checkout gagal:', checkoutData);
    return;
  }

  const orderId = checkoutData.data.order.id;
  console.log(`-> Sukses. Order ID Terbuat: ${orderId}`);

  // 2. KIRIM SIMULASI WEBHOOK DENGAN SIGNATURE VALID (Sukses Pembayaran)
  console.log('\n[2/4] Mengirim simulasi Webhook PAID (Signature Valid)...');
  const webhookBody = {
    orderId,
    status: 'settlement',
  };

  const validSignature = generateSignature(webhookBody, secret);

  const webhookRes = await fetch(`${API_URL}/webhook/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': validSignature,
    },
    body: JSON.stringify(webhookBody),
  });

  const webhookData: any = await webhookRes.json();
  console.log(`-> Respon Server: [Status ${webhookRes.status}]`, webhookData);

  // 3. PENGUJIAN IDEMPOTENSI (Kirim kembali webhook yang sama)
  console.log('\n[3/4] Menguji Idempotensi (Mengirim ulang webhook sukses)...');
  const idempotencyRes = await fetch(`${API_URL}/webhook/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': validSignature,
    },
    body: JSON.stringify(webhookBody),
  });

  const idempotencyData: any = await idempotencyRes.json();
  console.log(`-> Respon Server: [Status ${idempotencyRes.status}]`, idempotencyData);

  // 4. PENGUJIAN KEAMANAN SIGNATURE (Simulasi Tembakan Hacker)
  console.log('\n[4/4] Menguji sistem keamanan (Mengirim Signature Palsu)...');
  const fakeSignature = 'signature_palsu_hacker_123';
  const hackerRes = await fetch(`${API_URL}/webhook/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': fakeSignature,
    },
    body: JSON.stringify(webhookBody),
  });

  const hackerData: any = await hackerRes.json();
  console.log(`-> Respon Server: [Status ${hackerRes.status}]`, hackerData);
  console.log('\n--- UJI COBA SELESAI ---');
}

testWebhook().catch(console.error);
