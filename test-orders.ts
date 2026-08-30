import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const BASE_URL = 'http://localhost:3001/api';

async function testOrders() {
  console.log('--- MEMULAI PENGUJIAN USER ORDER HISTORY & E-TICKET QR CODE ---\n');

  // 1. Login user
  console.log('[1/4] Login user...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@example.com', password: 'password123' }),
  });
  const loginData: any = await loginRes.json();
  const token = loginData.data?.token;

  // 2. Ambil list order user
  console.log('\n[2/4] Mengambil riwayat order user (GET /api/orders/my-orders)...');
  const myOrdersRes = await fetch(`${BASE_URL}/orders/my-orders`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const myOrdersData: any = await myOrdersRes.json();
  console.log(`Status HTTP: ${myOrdersRes.status}`);
  console.log(`Total order ditemukan: ${myOrdersData.data?.orders?.length || 0}`);

  if (myOrdersData.data?.orders?.length > 0) {
    const latestOrder = myOrdersData.data.orders[0];
    console.log(`Order ID: ${latestOrder.id} - Status: ${latestOrder.status}`);

    // 3. Tes request E-Ticket
    console.log(`\n[3/4] Mencoba mengambil E-Ticket untuk Order ${latestOrder.id}...`);
    const ticketRes = await fetch(`${BASE_URL}/orders/${latestOrder.id}/ticket`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const ticketData: any = await ticketRes.json();
    console.log(`Status HTTP: ${ticketRes.status}`);

    if (ticketRes.status === 200) {
      console.log('Berhasil mendapatkan E-Ticket & QR Code!');
      console.log('QR Code format:', ticketData.data.ticket.qrCode.substring(0, 40) + '...');
    } else {
      console.log('Penolakan sesuai ekspektasi:', ticketData.message);
    }
  }

  console.log('\n--- PENGUJIAN SELESAI ---');
}

testOrders().catch(console.error);
