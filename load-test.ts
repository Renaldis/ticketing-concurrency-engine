import autocannon from 'autocannon';
import fs from 'fs';
import path from 'path';

const seedDataPath = path.join(process.cwd(), 'prisma', 'seed-data.json');
if (!fs.existsSync(seedDataPath)) {
  console.error('Error: lakukan "npx prisma db seed" terlebih dahulu untuk menggenerate data!');
  process.exit(1);
}

const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

const EVENT_ID = seedData.eventId;
const TICKET_CATEGORY_ID = seedData.ticketCategoryId; // VIP (Stock: 5)
const BASE_URL = 'http://localhost:3001/api'; // Mengarah ke port 3001 sesuai .env

async function getJwtToken(): Promise<string> {
  console.log('Mendapatkan JWT Token dari server...');
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'buyer@example.com',
      password: 'password123',
    }),
  });

  const body: any = await res.json();
  if (body.status !== 'success') {
    throw new Error('Gagal mendapatkan authentication token: ' + body.message);
  }

  console.log('Koneksi Auth Sukses. Token JWT didapatkan!');
  return body.data.token;
}

async function runLoadTest() {
  const token = await getJwtToken();

  console.log('Memulai simulasi Flash Sale...');
  console.log(
    'Mengirim 100 request checkout secara bersamaan ke tiket kategori VIP (Sisa Stok: 5)...',
  );

  const instance = autocannon(
    {
      url: 'http://localhost:3001',
      connections: 50, // Jumlah koneksi paralel terbuka
      amount: 100, // Total request yang dikirim
      requests: [
        {
          method: 'POST',
          path: '/api/checkout',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`, // Suntikkan JWT Token di header request!
          },
          body: JSON.stringify({
            eventId: EVENT_ID,
            ticketCategoryId: TICKET_CATEGORY_ID,
            quantity: 1, // Masing-masing membeli 1 tiket
          }), // payload body dibersihkan dari parameter userId!
        },
      ],
    },
    (err, result) => {
      if (err) {
        console.error('Error saat load test:', err);
        return;
      }
      console.log('\n====== HASIL LOAD TEST ======');
      console.log(`Total Request Terkirim : ${result.requests.sent}`);
      console.log(`Durasi Pengujian       : ${result.duration} detik`);
      console.log(`Request per Detik      : ${result.requests.average}`);
      console.log('=============================\n');
      console.log('Sekarang buka Prisma Studio / Query DB untuk melihat sisa tiket VIP.');
      console.log('Jika Pessimistic Lock / Redis Lock bekerja dengan JWT:');
      console.log('- remainingCapacity VIP harus tepat bernilai 0 (TIDAK BOLEH MINUS)');
      console.log('- Jumlah Record Order berstatus PENDING di DB harus tepat berjumlah 5');
    },
  );

  // Tampilkan progress log
  autocannon.track(instance);
}

runLoadTest().catch((e) => console.error('Gagal menjalankan load test:', e.message));
