# 🎟️ High-Concurrency Event Ticketing Engine

Backend REST API untuk platform pemesanan tiket konser/event berkapasitas tinggi. Dibangun dengan fokus pada **System Design, Concurrency Control, Atomic Operations, Distributed Caching, Background Job Queue, dan Idempotency**.

---

## 🚀 Fitur Utama

### 1. 🛡️ Concurrency & Anti-Overselling Engine
- **Atomic SQL Decrement**: Menggunakan Postgres Row-Level Lock & Atomic `UPDATE` (`WHERE remainingCapacity >= quantity`) untuk menjamin tidak akan terjadi *overselling* atau tiket minus saat ribuan user *checkout* bersamaan (Flash Sale).
- **Idempotency Key Engine**: Header `Idempotency-Key` (UUID) berbasis Redis untuk mencegah *double payment / double-ordering* akibat spam klik atau network retry.

### 2. ⏳ Asynchronous Background Worker
- **BullMQ + Redis Delayed Queue**: Pesanan yang belum dibayar dalam 2 menit akan otomatis dibatalkan (*auto-expire*) dan kuota tiket dikembalikan ke database tanpa membebani server utama.

### 3. 💳 Payment Gateway & Cryptographic Webhook
- **Midtrans Snap Integration**: Pembuatan token & URL pembayaran aman.
- **HMAC / SHA-512 Signature Verification**: Verifikasi kriptografis pesan webhook pembayaran untuk mencegah pemalsuan status transaksi.
- **Idempotent Webhook Handler**: Aman dari pengiriman webhook berulang (*at-least-once delivery*).

### 4. 🎫 E-Ticket & Gate QR Scanner
- **Base64 E-Ticket QR Generator**: Tiket otomatis menghasilkan QR Code setelah status pesanan `PAID`.
- **Gate Check-in API**: Staf gate dapat memindai tiket dengan proteksi anti-duplikasi (*double-entry prevention*).

### 5. 📊 Admin Reporting & Analytics
- **Sales & Revenue Summary**: Agregasi pendapatan, persentase penjualan per kategori tiket, dan jumlah kehadiran (*gate attendance*).
- **Global Order Monitoring**: Pemantauan transaksi seluruh user secara *real-time*.

### 6. 🔒 Security & Validation
- **Authentication & RBAC**: JWT Access Token + Password hashing (Bcrypt) dengan proteksi peran `ADMIN` dan `CUSTOMER`.
- **Redis Rate Limiting**: Proteksi *brute-force* pada endpoint login (max 5 req/menit) dan checkout spamming (max 3 req/10s).
- **Strict Zod Validation**: Validasi seluruh request body, params, dan query.
- **Security Headers & File Filtering**: Helmet protection dan validasi upload poster Multer (max 2MB, format JPEG/PNG/WEBP).

---

## 🛠️ Tech Stack

- **Runtime & Language**: Node.js, TypeScript (ESM)
- **Framework**: Express.js
- **Database & ORM**: PostgreSQL, Prisma ORM
- **In-Memory & Cache**: Redis (ioredis)
- **Message Queue**: BullMQ
- **Cloud Storage**: Cloudflare R2 / AWS S3 SDK
- **Documentation**: Swagger UI & OpenAPI 3.0 (YAML)
- **Load Testing**: Autocannon

---

## 📁 Struktur Direktori

```text
src/
├── config/         # Konfigurasi Database (Prisma), Redis, S3/R2, BullMQ
├── controllers/    # Controller Layer (Manual Dependency Injection)
├── middleware/     # Auth, Role, Rate Limiter, Idempotency, Zod, Error, Upload
├── repositories/   # Data Access Object (DAO / DB Queries)
├── routes/         # Routing Express (REST Endpoints)
├── services/       # Core Business Logic & Concurrency Operations
├── utils/          # Helper (Async Handler, AppError, Midtrans, S3, QR Code)
├── validators/     # Skema Validasi Zod (Auth, Event, Checkout, Ticket)
├── workers/        # BullMQ Worker (Order Expiration Auto-Release)
└── index.ts        # Server Entry Point
```

---

## ⚙️ Panduan Menjalankan Proyek

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Konfigurasi Environment (`.env`)
Buat file `.env` dan sesuaikan variabel berikut:
```env
PORT=3001
DATABASE_URL="postgresql://user:password@localhost:5432/ticketing_db?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your_super_secret_jwt_key"
WEBHOOK_SECRET="your_webhook_secret_key"
MIDTRANS_SERVER_KEY="your_midtrans_server_key"
R2_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"
R2_BUCKET_NAME="ticketing-bucket"
R2_PUBLIC_URL="https://pub-xxxx.r2.dev"
```

### 3. Database Migration & Seeding
```bash
npx prisma db push
npx prisma db seed
```

### 4. Menjalankan Server
```bash
# Mode Development
npm run dev

# Mode Production
npm run build
npm start
```

---

## 📖 Dokumentasi API (Swagger)

Setelah server berjalan, akses dokumentasi interaktif Swagger UI di:
👉 **`http://localhost:3001/api-docs`**

---

## 🧪 Skrip Pengujian Otomatis (Testing Suite)

Proyek ini dilengkapi serangkaian integration & load test otomatis:

| Command | Deskripsi |
|---|---|
| `npm run test:auth` | Uji registrasi, login, duplikasi email, dan validasi Zod |
| `npm run test:catalog` | Uji Event CRUD, Multipart Poster Upload, & RBAC Admin |
| `npm run test:idempotency` | Uji proteksi transaksi ganda via header `Idempotency-Key` |
| `npm run test:webhook` | Uji webhook Midtrans, verifikasi signature SHA-512, & idempotensi |
| `npm run test:ratelimit` | Uji proteksi sliding-window rate limiter Redis (HTTP 429) |
| `npm run test:orders` | Uji histori transaksi user & generator E-Ticket QR Code |
| `npm run test:checkin` | Uji pemindaian QR gate masuk & penolakan tiket duplikat |
| `npm run test:admin` | Uji analitik ringkasan event & monitoring order global admin |
| `npm run test:load` | Uji ketahanan Flash Sale (100 request paralel via Autocannon) |
