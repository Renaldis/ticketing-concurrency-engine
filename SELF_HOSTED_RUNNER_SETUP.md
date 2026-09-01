# Panduan Setup GitHub Actions Self-Hosted Runner di VM Mini PC (Private NAT)

Karena Mini PC berada di jaringan WiFi lokal (Private NAT tanpa IP Publik), kita menggunakan **GitHub Actions Self-Hosted Runner**. Runner ini akan melakukan *long-polling outbound* ke GitHub (Port 443 HTTPS), sehingga aman tanpa perlu port forwarding atau VPN.

---

## 📋 Langkah 1: Persiapan di VM Production Mini PC

Pastikan di dalam VM Ubuntu / Debian / Linux Mini PC kamu sudah terinstall **Docker** dan **Docker Compose**:

```bash
# Update package & install docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 git curl

# Izinkan user saat ini menjalankan docker tanpa sudo (opsional tapi disarankan)
sudo usermod -aG docker $USER
newgrp docker
```

---

## 🔑 Langkah 2: Daftarkan Self-Hosted Runner ke GitHub

1. Buka Repository GitHub backend kamu (`https://github.com/Renaldis/ticketing-concurrency-engine`).
2. Masuk ke menu **Settings** -> **Actions** -> **Runners**.
3. Klik tombol **New self-hosted runner**.
4. Pilih OS: **Linux**, Arsitektur: **x64** (atau **ARM64** jika Mini PC menggunakan prosesor ARM).
5. Jalankan baris perintah yang diberikan GitHub di terminal VM kamu:

```bash
# Contoh langkah instalasi di terminal VM:
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/v2.322.0/actions-runner-linux-x64-2.322.0.tar.gz
tar xzf ./actions-runner-linux-x64.tar.gz

# Jalankan config dengan token dari GitHub kamu
./config.sh --url https://github.com/Renaldis/ticketing-concurrency-engine --token <TOKEN_DARI_GITHUB>
```

---

## ⚡ Langkah 3: Jalankan Runner sebagai Systemd Service (Otomatis Nyala Saat Reboot)

Agar runner selalu berjalan di background dan otomatis aktif saat Mini PC menyala kembali:

```bash
# Install service
sudo ./svc.sh install

# Nyalakan service
sudo ./svc.sh start

# Cek status service
sudo ./svc.sh status
```

Status runner di GitHub Settings -> Actions -> Runners akan berubah menjadi **Idle (Hijau/Online)**.

---

## 🔐 Langkah 4: Setup File Environment `.env` di VM

Di dalam folder proyek di VM (atau file `.env` di direktori workspace runner), siapkan variabel production:

```env
PORT=3001
NODE_ENV=production

# Database & Redis Local (Otomatis diarahkan antar container)
DB_USER=postgres
DB_PASSWORD=buat_password_db_rahasia_disini
DB_NAME=ticketing_prod

# Auth & Integrasi
JWT_SECRET=super_secret_jwt_key_2026_acak_panjang
WEBHOOK_SECRET=super_secret_webhook_key_2026
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx
MIDTRANS_IS_PRODUCTION=false
FRONTEND_URL=http://<IP_LOCAL_MINI_PC>:3000

# Cloudflare R2 Image Storage (Opsional)
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=ticketing-images-bucket
R2_PUBLIC_URL=https://pub-your-bucket.r2.dev
```

---

## 🚀 Langkah 5: Cara Kerja CI/CD

Setiap kali kamu melakukan `git push` ke branch `main`:
1. **GitHub Cloud Runner** akan menjalankan linting & build check TypeScript (`ci-test-and-build`).
2. Jika sukses, **Self-Hosted Runner di VM Mini PC** kamu akan otomatis menerima sinyal deployment.
3. VM akan mengeksekusi `docker compose build --no-cache app && docker compose up -d` dan menjalankan migrasi database Prisma secara otomatis!
