import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3001/api';

async function runCatalogTest() {
  console.log('--- MEMULAI PENGUJIAN EVENT CATALOG & MULTIPART FILE UPLOAD ---\n');

  // [Tes 1] Ambil daftar Event Publik (Menguji Pagination & Detail Relasi)
  console.log('[1/4] Menguji GET /api/events (Daftar Event Paginated)...');
  try {
    const res = await fetch(`${BASE_URL}/events?page=1&limit=5`);
    const data = await res.json();
    console.log('Response (Pagination List):', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Tes 1 Gagal:', err.message);
  }
  console.log('');

  // [Tes 2] Mendaftarkan Event Baru Tanpa Login (Harus Ditolak 401)
  console.log('[2/4] Mencoba mendaftar event baru tanpa JWT Token...');
  try {
    const res = await fetch(`${BASE_URL}/events`, { method: 'POST' });
    const data = await res.json();
    console.log('Response (Ditolak 401):', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Tes 2 Gagal:', err.message);
  }
  console.log('');

  // [Tes 3] Dapatkan JWT Token Terlebih Dahulu dengan Login
  console.log('[3/4] Melakukan login untuk mendapatkan otorisasi Admin...');
  let token = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'buyer@example.com', password: 'password123' }),
    });
    const loginData: any = await loginRes.json();
    token = loginData.data.token;
    console.log('Login Sukses, Token JWT Disimpan!');
  } catch (err: any) {
    console.error('Tes Gagal Login:', err.message);
    process.exit(1);
  }
  console.log('');

  // [Tes 4] Mendaftarkan Event Baru + Simulasi Upload Poster Gambar (Multipart/Form-Data)
  console.log('[4/4] Mendaftarkan event baru beserta file poster (Multipart)...');
  try {
    const formData = new FormData();
    formData.append('title', `Jakarta Rock Festival ${Date.now()}`);
    formData.append(
      'description',
      '<h1>The biggest rock show in town!</h1><p>Join the moshpit.</p>',
    );
    formData.append('location', 'Stadion Utama Gelora Bung Karno, Jakarta');
    formData.append('date', new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()); // 10 hari ke depan

    // Kategori tiket didefinisikan dalam bentuk Array JSON
    const ticketCategories = [
      { name: 'CAT 1 VIP', price: 1200000, capacity: 10 },
      { name: 'CAT 2 Festival', price: 600000, capacity: 100 },
    ];
    formData.append('categories', JSON.stringify(ticketCategories));

    // Siapkan poster gambar tiruan berbentuk Blob data
    const dummyImageBlob = new Blob(['fake-binary-image-data-here-cool-poster'], {
      type: 'image/png',
    });
    formData.append('image', dummyImageBlob, 'rock-poster.png');

    const res = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`, // Sertakan JWT auth token
      },
      body: formData, // Kirim payload dalam format FormData (otomatis menyusun header Boundary Multipart)
    });

    const data = await res.json();
    console.log('Response (Event Created):', JSON.stringify(data, null, 2));

    if (data.status === 'success') {
      const newEventId = data.data.event.id;
      console.log(`\n[Bonus Tes] Menampilkan detail Event Baru (ID: ${newEventId})...`);
      const getDetailRes = await fetch(`${BASE_URL}/events/${newEventId}`);
      const detailData = await getDetailRes.json();
      console.log('Response Detail Event:', JSON.stringify(detailData, null, 2));
    }
  } catch (err: any) {
    console.error('Tes 4 Gagal:', err.message);
  }

  console.log('\n--- PENGUJIAN SELESAI ---');
}

runCatalogTest();
