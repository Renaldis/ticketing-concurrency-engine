import autocannon from 'autocannon';

// 1. Definisikan ID data dari database kamu (bisa dicontek dari Prisma Studio)
const USER_ID = '68a5962b-24c2-48c0-9245-712bc5101f77';
const EVENT_ID = '00836401-4aec-45b4-a00a-448c06eb5757';
const TICKET_CATEGORY_ID = '05ddf395-4986-4e6f-9bd4-2111d0a6f239'; // Yang stoknya cuma 5

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
