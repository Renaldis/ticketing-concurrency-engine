# 🎟️ High-Concurrency Event Ticketing Engine (Backend)

Backend REST API untuk platform pemesanan tiket konser, maraton, seminar, dan festival berkapasitas tinggi. Dibangun dengan fokus pada **System Design, Concurrency Control, Atomic Operations, Distributed Caching, Background Job Queue, Idempotency, dan Late Settlement Auto-Recovery**.

---

## 🚀 Fitur Utama

### 1. 🛡️ Concurrency & Anti-Overselling Engine
- **Atomic SQL Decrement**: Menggunakan PostgreSQL Row-Level Lock & Atomic `UPDATE` (`WHERE remainingCapacity >= quantity`) untuk menjamin tidak akan terjadi *overselling* atau tiket minus saat ribuan user *checkout* bersamaan (Flash Sale).
- **Idempotency Key Engine**: Header `Idempotency-Key` (UUID) berbasis Redis untuk mencegah *double payment / double-ordering* akibat spam klik atau network retry.

### 2. ⏳ Asynchronous Background Worker & Dynamic Expiration
- **BullMQ + Redis Delayed Queue**: Pembatalan pesanan yang belum dibayar dan pengembalian stok tiket secara otomatis tanpa blocking server.
- **Dynamic TTL Configurable by Admin**: Batas waktu countdown pembayaran dapat disesuaikan oleh Admin (2 s/d 60 menit) melalui Redis, otomatis tersinkronisasi ke batas waktu invoice Midtrans Snap.

### 3. 💳 Payment Gateway & Smart Auto-Recovery
- **Midtrans Snap Integration**: Pembuatan token & URL pembayaran aman dengan parameter `expiry` tersinkronisasi.
- **Smart Order Auto-Recovery**: Jika pesanan terlanjur `CANCELLED` oleh worker tetapi pembayaran sukses di Midtrans, sistem secara cerdas mengecek kuota tiket dan memulihkan status order kembali menjadi `PAID` (Auto-Recovered).
- **Cryptographic Webhook Verification**: Verifikasi tanda tangan SHA-512 Midtrans + HMAC-SHA256 fallback signature (Mendukung alias `/api/webhook/payment` & `/api/webhooks/payment`).
- **Direct Status Sync (`POST /api/orders/:id/sync-status`)**: Sinkronisasi status pesanan seketika langsung ke API Midtrans.

### 4. 🌐 Universal Multi-Category Events & SEO Slugs
- **Multi-Category Events**: Mendukung kategori `CONCERT`, `SPORTS`, `SEMINAR`, `WEBINAR`, `EXHIBITION`, `WORKSHOP`, `FESTIVAL`.
- **SEO-Friendly Slug Routing**: Endpoint `GET /api/events/:id` mendukung pencarian data via UUID maupun URL Slug (misal: `/events/neon-symphony-live-concert-2026`).
- **Live Stock Adjuster API**: Endpoint `PATCH /api/events/categories/:categoryId/stock` untuk menambah/mengurangi sisa kuota tiket live.

### 5. 🎫 E-Ticket & Gate QR Scanner
- **Base64 E-Ticket QR Generator**: Tiket otomatis menghasilkan QR Code setelah status pesanan `PAID`.
- **Gate Check-in API**: Staf gate dapat memindai tiket dengan proteksi anti-duplikasi (*double-entry prevention*).

### 6. 📊 Admin Reporting & Platform Telemetry
- **Platform-Wide Summary (`GET /api/admin/summary`)**: Agregasi total pendapatan, total tiket terjual, kehadiran gate, dan total kuota seluruh event.
- **Event Sales Analytics (`GET /api/admin/events/:id/summary`)**: Rincian performa per event dan persentase penjualan tiap tier kategori tiket.
- **Global Order Monitoring (`GET /api/admin/orders`)**: Audit log seluruh transaksi customer dengan filter status & search.

### 7. 🔒 Security & Validation
- **Authentication & RBAC**: JWT Access Token + Password hashing (Bcrypt) dengan proteksi peran `ADMIN` dan `CUSTOMER`.
- **Redis Rate Limiting**: Proteksi *brute-force* pada endpoint login (max 5 req/menit) dan checkout spamming (max 3 req/10s).
- **Strict Zod Validation**: Validasi seluruh request body, params, dan query.
- **Security Headers & File Filtering**: Helmet protection dan validasi upload poster Multer (max 2MB, format JPEG/PNG/WEBP ke Cloudflare R2 / S3).

---

## 🛠️ Tech Stack

- **Runtime & Language**: Node.js, TypeScript (ESM)
- **Framework**: Express.js
- **Database & ORM**: PostgreSQL (Neon Serverless), Prisma ORM
- **In-Memory & Cache**: Redis (Upstash Redis)
- **Message Queue**: BullMQ
- **Cloud Storage**: Cloudflare R2 / AWS S3 SDK
- **Payment Gateway**: Midtrans Snap API
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
├── services/       # Core Business Logic, Concurrency & Recovery Operations
├── utils/          # Helper (Async Handler, AppError, Midtrans, S3, QR Code)
├── validators/     # Skema Validasi Zod (Auth, Event, Checkout, Ticket)
├── workers/        # BullMQ Worker (Order Expiration Auto-Release)
└── index.ts        # Server Entry Point
```

---

## ⚙️ Panduan Menjalankan Proyek

### 1. Install Dependencies
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
MIDTRANS_CLIENT_KEY="your_midtrans_client_key"
MIDTRANS_IS_PRODUCTION=false
R2_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="your_access_key"
R2_SECRET_ACCESS_KEY="your_secret_key"
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
