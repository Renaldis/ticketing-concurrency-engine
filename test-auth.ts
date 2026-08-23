import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3001/api';

async function testAuth() {
  console.log('--- MEMULAI PENGUJIAN USER AUTHENTICATION & ZOD VALIDATION ---\n');

  // Generator email unik agar pengujian bisa diulang tanpa tabrakan akun
  const uniqEmail = `user_${Date.now()}@example.com`;
  const password = 'secretPassword123';

  // [Tes 1] Mengirim payload salah ke Register (Membuktikan Validasi Zod & Global Error)
  console.log('[1/5] Menguji validasi format email salah...');
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'salah-format-email', password: '123' }), // Password < 6
    });
    const data = await res.json();
    console.log('Response (Zod Error):', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Tes 1 Gagal:', err.message);
  }
  console.log('');

  // [Tes 2] Melakukan Registrasi Sukses
  console.log('[2/5] Mendaftarkan user baru dengan email unik...');
  let registerResData: any;
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqEmail, password, name: 'Budi Test' }),
    });
    registerResData = await res.json();
    console.log('Response (Register):', JSON.stringify(registerResData, null, 2));
  } catch (err: any) {
    console.error('Tes 2 Gagal:', err.message);
  }
  console.log('');

  // [Tes 3] Mendaftarkan Email yang Sama (Membuktikan Konflik Email / AppError)
  console.log('[3/5] Mendaftarkan email yang sama lagi (menguji proteksi duplikasi)...');
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqEmail, password, name: 'Budi Test Duplikat' }),
    });
    const data = await res.json();
    console.log('Response (Collision AppError):', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Tes 3 Gagal:', err.message);
  }
  console.log('');

  // [Tes 4] Melakukan Login Sukses & Mendapatkan JWT Token
  console.log('[4/5] Melakukan login dengan sandi yang benar...');
  let loginResData: any;
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqEmail, password }),
    });
    loginResData = await res.json();
    console.log('Response (Login Sukses & JWT):', JSON.stringify(loginResData, null, 2));
  } catch (err: any) {
    console.error('Tes 4 Gagal:', err.message);
  }
  console.log('');

  // [Tes 5] Melakukan Login Gagal (Sandi Salah)
  console.log('[5/5] Melakukan login dengan sandi salah...');
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqEmail, password: 'sandi_salah_total' }),
    });
    const data = await res.json();
    console.log('Response (Login Gagal AppError):', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Tes 5 Gagal:', err.message);
  }
  console.log('\n--- PENGUJIAN SELESAI ---');
}

testAuth();
