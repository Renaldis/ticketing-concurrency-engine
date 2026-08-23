import autocannon from 'autocannon';
import fs from 'fs';
import path from 'path';

const seedDataPath = path.join(process.cwd(), 'prisma', 'seed-data.json');
if (!fs.existsSync(seedDataPath)) {
  console.error('Error: lakukan "npx prisma db seed" terlebih dahulu untuk menggenerate data!');
  process.exit(1);
}

const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

// 1. ID otomatis di ambil dari hasil generate seed data dummy
const USER_ID = seedData.userId;
const EVENT_ID = seedData.eventId;
const TICKET_CATEGORY_ID = seedData.ticketCategoryId; // Yang stoknya cuma 5

const payload = JSON.stringify({
  userId: USER_ID,
  eventId: EVENT_ID,
  ticketCategoryId: TICKET_CATEGORY_ID,
  quantity: 1, // Masing-masing request membeli 1 tiket
});

async function runLoadTest() {
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
          },
          body: payload,
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
      console.log('Jika Pessimistic Lock bekerja:');
      console.log('- remainingCapacity VIP harus tepat bernilai 0 (TIDAK BOLEH MINUS)');
      console.log('- Jumlah Record Order berstatus PENDING di DB harus tepat berjumlah 5');
    },
  );

  // Tampilkan progress log
  autocannon.track(instance);
}

runLoadTest();
