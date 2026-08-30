import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const BASE_URL = 'http://localhost:3001/api';

async function runAdminTest() {
  console.log('--- MEMULAI PENGUJIAN ADMIN ANALYTICS & ORDERS MONITORING ---\n');

  const seedDataPath = path.join(process.cwd(), 'prisma', 'seed-data.json');
  const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
  const { eventId } = seedData;

  // 1. Login sebagai Admin
  console.log('[1/3] Login Admin...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'password123' }),
  });
  const adminToken = (await loginRes.json()).data.token;

  // 2. Menguji GET /api/admin/orders
  console.log('\n[2/3] Mengambil seluruh transaksi pesanan (GET /api/admin/orders)...');
  const ordersRes = await fetch(`${BASE_URL}/admin/orders?page=1&limit=5`, {
    headers: { authorization: `Bearer ${adminToken}` },
  });
  const ordersData: any = await ordersRes.json();
  console.log(`Status HTTP: ${ordersRes.status}`);
  console.log(`Total pesanan di DB: ${ordersData.data?.pagination?.totalCount}`);

  // 3. Menguji GET /api/admin/events/:id/summary
  console.log(
    `\n[3/3] Mengambil analitik penjualan Event (GET /api/admin/events/${eventId}/summary)...`,
  );
  const summaryRes = await fetch(`${BASE_URL}/admin/events/${eventId}/summary`, {
    headers: { authorization: `Bearer ${adminToken}` },
  });
  const summaryData: any = await summaryRes.json();
  console.log(`Status HTTP: ${summaryRes.status}`);
  console.log('Event Analytics Summary:\n', JSON.stringify(summaryData.data?.summary, null, 2));

  console.log('\n--- PENGUJIAN ADMIN SELESAI ---');
}

runAdminTest().catch(console.error);
