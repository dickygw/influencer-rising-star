# Dokumentasi Pengembangan Proyek: Influencer Rising Star (Duta Pegadaian)

Dokumen ini merangkum seluruh keputusan arsitektur, integrasi sistem pihak ketiga, fitur antarmuka premium, serta konfigurasi teknis yang telah diimplementasikan dalam aplikasi **Influencer Rising Star (IRS)** untuk PT Pegadaian (Persero).

---

## 📌 Daftar Isi
1. [Ringkasan Proyek & Teknologi](#1-ringkasan-proyek--teknologi)
2. [Alur Verifikasi Otomatis (Stage 1 - Apify Scraper)](#2-alur-verifikasi-otomatis-stage-1---apify-scraper)
3. [Alur Verifikasi Manual (Stage 2 - Local OCR Offline)](#3-alur-verifikasi-manual-stage-2---local-ocr-offline)
4. [Fitur Sinkronisasi Metrik Admin (On-Demand Sync)](#4-fitur-sinkronisasi-metrik-admin-on-demand-sync)
5. [Peningkatan UI/UX & Animasi Premium](#5-peningkatan-uiux--animasi-premium)
6. [Panduan Konfigurasi Environment (`.env.local`)](#6-panduan-konfigurasi-environment-envlocal)
7. [Penanganan Masalah & Optimasi Next.js (Troubleshooting)](#7-penanganan-masalah--optimasi-nextjs-troubleshooting)

---

## 1. Ringkasan Proyek & Teknologi
Aplikasi **Influencer Rising Star** dirancang untuk mengelola dan memverifikasi kontribusi media sosial (Instagram, TikTok, Facebook, X) dari karyawan PT Pegadaian selaku *brand advocate*. Poin diberikan secara otomatis atau manual berdasarkan keaslian postingan, username yang cocok, dan penggunaan hashtag wajib `#IRS2026`.

### Stack Teknologi Utama:
* **Framework**: Next.js 16.2 (App Router) menggunakan Turbopack & React 19.
* **Database & Auth**: Supabase (PostgreSQL) dengan sinkronisasi realtime.
* **Scraper Eksternal**: Apify Client (`apify/instagram-post-scraper`).
* **Mesin OCR Lokal**: `tesseract.js` (dijalankan sepenuhnya *offline* di sisi server).
* **Desain UI/UX**: Vanilla CSS dengan variabel CSS kustom untuk Duta Pegadaian (Gold & Green).

---

## 2. Alur Verifikasi Otomatis (Stage 1 - Apify Scraper)
Sistem dapat memvalidasi tautan postingan Instagram publik secara langsung tanpa memerlukan login dari sisi pengguna.

### Integrasi Utama:
* **Penghapusan RapidAPI**: Seluruh kode pihak ketiga berbasis RapidAPI telah **dihapus sepenuhnya** demi keamanan data Pegadaian dan menghindari potensi kebocoran data (*data leakage*).
* **Penggunaan Apify Actor**: Menggunakan actor resmi `apify/instagram-post-scraper` yang aman dan andal.
* **Perbaikan Validasi Skema (Update Penting)**:
  Aktor Apify mewajibkan adanya parameter `username` dalam format *array* di samping `directUrls`. Kode telah disesuaikan agar mengirimkan payload berikut untuk menghindari error *"Field input.username is required"*:
  ```json
  {
    "username": ["handle_instagram_karyawan"],
    "directUrls": ["https://www.instagram.com/p/post_id/"],
    "resultsLimit": 1
  }
  ```
* **Strict Production Mode**: Jika `APIFY_TOKEN` terkonfigurasi namun pemanggilan gagal (karena token habis atau diblokir), sistem secara tegas mengembalikan pesan error **`"Apify Token Habis / Tidak Valid"`** dan tidak akan diam-diam masuk ke mode simulasi (sandbox) demi menjaga validitas data poin.
* **Dynamic Mock Mode (Lokal)**: Jika `APIFY_TOKEN` dikosongkan (untuk keperluan develop lokal), developer dapat menyimulasikan data interaksi lewat query parameter URL, contoh: `?likes=250&comments=15&views=1200`.

---

## 3. Alur Verifikasi Manual (Stage 2 - Local OCR Offline)
Karyawan dapat mengunggah screenshot bukti postingan (terutama untuk Story atau jika akun bersifat privat).

### Kelebihan Utama Dibanding Google Cloud Vision/Gemini:
* **100% Gratis Selamanya**: Tidak membutuhkan biaya API atau setup billing kartu kredit Google Cloud.
* **Keamanan Data Maksimal**: Gambar screenshot **tidak pernah dikirim keluar dari server**. Semua proses pembacaan teks dilakukan lokal di server Next.js Anda.

### Konfigurasi Teknis Offline:
1. **Pustaka**: Menggunakan `tesseract.js` versi Node.js.
2. **Local Language Model Caching**:
   Berkas model bahasa **`eng.traineddata.gz`** diunduh dan disimpan secara lokal di folder `./tessdata`. Mesin OCR dikonfigurasi untuk membaca langsung dari penyimpanan lokal sehingga inisialisasi berjalan instan (kurang dari 100ms) tanpa dipengaruhi oleh *proxy/firewall* kantor Pegadaian:
   ```typescript
   const worker = await createWorker('eng', 1, {
     langPath: path.join(process.cwd(), 'tessdata'),
     cachePath: path.join(process.cwd(), 'tessdata'),
   });
   ```
3. **Kriteria Kelulusan Otomatis (OCR Rules)**:
   * **Username Check**: Teks screenshot harus mengandung username media sosial terdaftar karyawan (simbol `@` dan huruf besar/kecil diabaikan).
   * **Hashtag Check**: Teks screenshot harus mengandung hashtag wajib **`#IRS2026`** (huruf besar/kecil diabaikan).
   * Jika salah satu atau kedua kriteria tidak terpenuhi (atau jika yang diunggah adalah foto random seperti foto meja kerja atau selfie), sistem akan menolak submit secara instan dengan pesan error merah.

---

## 4. Fitur Sinkronisasi Metrik Admin (On-Demand Sync)
Untuk menghemat kuota token API Apify, tombol pembaruan statistik postingan dibatasi hanya di sisi **Admin**.

* **Letak Fitur**: Pada halaman tabel **Kelola Karyawan** (`admin/karyawan`), di kolom **Engagement Konten**.
* **Cara Kerja**: Admin mengklik tombol **`🔄 Sync Engagement`** $\rightarrow$ Server memanggil Apify untuk mengambil jumlah *Likes* dan *Views* terbaru $\rightarrow$ Menyimpan statistik terbaru ke database Supabase `post_engagement_stats` $\rightarrow$ Tampilan tabel admin terupdate secara realtime.

---

## 5. Peningkatan UI/UX & Animasi Premium
Untuk membuat aplikasi terlihat premium dan interaktif, kami telah membangun dua komponen animasi kustom yang menarik:

### A. Confirmation Dialog Kustom (`confirmation-dialog.tsx`)
Menggantikan alert bawaan browser yang membosankan dengan dialog interaktif.
* **Animasi**: Efek elastis memantul (*spring bounce-in*) berdurasi 300ms dengan *backdrop-blur* 8px.
* **Efek Halo Ring**: Ikon di atas berdenyut secara kontinu (*pulse glow*).
* **Tema Warna**:
  * 🟢 **Success (Hijau)**: Untuk persetujuan postingan (Approve).
  * 🔴 **Danger (Merah)**: Untuk penolakan postingan (Reject) dan hapus tautan akun sosial media.
  * 🔵 **Info (Biru)**: Untuk pengiriman postingan baru dan sinkronisasi data engagement.

### B. Smartphone Upload Loading Overlay (Submission Page)
Ditampilkan selama proses submit postingan (karena proses scraping otomatis atau OCR manual membutuhkan waktu beberapa detik).
* **Desain**: Mockup handphone melayang (*floating phone*) dengan layar yang menampilkan transisi postingan Instagram yang bergerak naik (*slide up*).
* **Efek**: Pesawat kertas terbang keluar dari layar handphone menuju awan di atasnya.
* **Progres Dinamis**: Teks status berganti secara otomatis setiap 1,8 detik agar pengguna mengetahui tahap pemrosesan (misal: *"Menghubungkan ke Instagram..."*, *"Menyiapkan mesin OCR lokal..."*, dll.).

---

## 6. Panduan Konfigurasi Environment (`.env.local`)
Tambahkan variabel berikut pada file konfigurasi environment server Anda:

```env
# URL dan Kunci Akses Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Token Apify Scraper (Dapatkan dari console.apify.com)
APIFY_TOKEN="apify_api_your_token_here"
```
*(Catatan: GEMINI_API_KEY tidak lagi dibutuhkan karena proses verifikasi manual telah dimigrasikan sepenuhnya ke Tesseract OCR lokal).*

---

## 7. Penanganan Masalah & Optimasi Next.js (Troubleshooting)

### A. Error: `Cannot find module ... worker-script/node/index.js`
* **Penyebab**: Next.js mencoba mengemas (*bundle*) modul internal `tesseract.js` yang menggunakan *worker threads* multi-proses Node.js.
* **Solusi**: Daftarkan pustaka ini ke dalam `serverExternalPackages` pada file `next.config.ts` agar Next.js membacanya langsung dari `node_modules` tanpa bundling:
  ```typescript
  const nextConfig: NextConfig = {
    experimental: {
      serverActions: {
        bodySizeLimit: '10mb' // Mengizinkan upload screenshot berukuran besar
      }
    },
    serverExternalPackages: ['tesseract.js']
  };
  ```

### B. Pengajuan Selalu Bertahan di Status "Pending"
* **Penyebab**: Panggilan ke pustaka OCR lokal atau Scraper Apify mengalami error di server backend, sehingga memicu *fail-safe fallback* (mengalihkan pengajuan ke antrean manual Admin Kanwil agar program tidak crash).
* **Solusi**: Periksa log server Next.js Anda. Pastikan berkas di direktori `./tessdata/eng.traineddata.gz` ada dan dapat dibaca oleh proses Node.js, serta pastikan `APIFY_TOKEN` di file `.env.local` diisi dengan benar.

---

*Dokumen ini dibuat secara otomatis untuk merepresentasikan hasil diskusi pengembangan fitur per tanggal 15 Juli 2026.*
