# 🎓 EDU BTOP - Sistem Maya Pembelajaran (Virtual Class)

Sistem Maya **Edu BTOP** dibina untuk pengurusan bahan pembelajaran dan pemantauan kehadiran pelajar bagi 4 subjek utama: **Matematik**, **Bahasa Inggeris**, **Bahasa Melayu**, dan **Sejarah**.

---

## 🚀 Ciri-Ciri Utama System

- 🔑 **Peranan Role-Based**: Log masuk sebagai **Admin BTOP** atau **Pelajar**.
- 📚 **4 Subjek Utama**: Matematik (`Math`), Bahasa Inggeris, Bahasa Melayu, dan Sejarah.
- 📤 **Pengurusan Bahan Pembelajaran (Admin)**: Muat naik nota PDF, dokumen latihan, dan pautan video pembelajaran.
- 👥 **Pendaftaran E-mel Pelajar (Admin)**: Admin boleh menambah e-mel & kata laluan pelajar baru secara terus.
- ⏱️ **Kehadiran Auto (Pelajar)**: Apabila pelajar menekan / membuka bahan pembelajaran, kehadiran akan direkodkan secara automatik ke dalam pangkalan data.
- 📊 **Laporan Guru (Admin)**: Penjana laporan ringkasan dan statistik kehadiran bersedia untuk dicetak.

---

## 🛠️ Modul & Pemasangan Tempatan (Local Setup)

### 1. Klon Repositori
```bash
git clone https://github.com/AqilMizwar62/Virtual-Class-Btop.git
cd Virtual-Class-Btop
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Konfigurasi Fail `.env`
Salin `.env.example` ke `.env`:
```bash
PORT=3000
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=btop
DB_PORT=3306
SESSION_SECRET=your_secret_key_here
```

### 4. Setup Pangkalan Data MySQL (`schema.sql`)
Import fail `schema.sql` ke dalam MySQL anda untuk membina jadual & akaun contoh:
- **Admin**: `admin@btop.my` / `admin123`
- **Student 1**: `student1@edu.my` / `student123`
- **Student 2**: `student2@edu.my` / `student123`

### 5. Jalankan Pelayan (Server)
```bash
npm start
```
Buka penyemak imbas (browser) di: `http://localhost:3000`

---

## 👥 Aliran Kerja Kolaborasi Git (Kerjasama Rakan)

Setiap kali anda atau rakan hendak mula membuat tugasan:
```bash
# 1. Tarik maklumat terkini daripada rakan di GitHub
git pull

# 2. Selepas siap kod baru
git add .
git commit -m "Tambah ciri baru"
git push
```

---

## 🌐 Penyebaran ke Render (Render Deployment Guide)

1. Sambungkan repositori GitHub anda di **Render** (`https://render.com`) sebagai **Web Service**.
2. Set **Build Command**: `npm install`
3. Set **Start Command**: `node server.js`
4. Masukkan Pembolehubah Persekitaran (Environment Variables):
   - `DB_HOST` (Hos MySQL luaran seperti Aiven / Railway)
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME` = `btop`
   - `DB_PORT` = `3306`
