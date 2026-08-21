<div align="center">

# 🌟 Influencer Rising Star (IRS)
### *Platform Employee Influencer & Gamifikasi Media Sosial PT Pegadaian (Persero)*

[![Next.js](https://img.shields.io/badge/Next.js-16.3.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/Google%20Gemini-Vision%20AI-8E75B2?style=for-the-badge&logo=google)](https://aistudio.google.com/)
[![Tesseract.js](https://img.shields.io/badge/Tesseract.js-Offline%20OCR-5C6BC0?style=for-the-badge)](https://tesseract.projectnaptha.com/)

<br />

**Influencer Rising Star (IRS)** adalah platform internal berbasis web yang dirancang untuk mengelola, memverifikasi, dan mengapresiasi keaktifan seluruh insan Pegadaian sebagai *Brand Advocate* di media sosial (Instagram, dsb.).

[Fitur Utama](#-fitur-utama) • [Tech Stack](#-arsitektur--tech-stack) • [Panduan Instalasi](#-panduan-instalasi--memulai) • [Konfigurasi Environment](#-konfigurasi-environment-envlocal) • [Database & Migrasi](#-skema-database--migrasi-supabase)

---

</div>

## 📖 Tentang Proyek

Aplikasi **Influencer Rising Star** memberikan ekosistem penghargaan berbasis gamifikasi untuk meningkatkan keterlibatan karyawan dalam mempromosikan produk, program literasi emas, dan kegiatan resmi PT Pegadaian (Persero).

Sistem ini menghubungkan karyawan (Insan Pegadaian) dengan tim pengelola (Admin Kanwil & Admin Pusat) melalui alur verifikasi konten otomatis berkecepatan tinggi, integrasi *Vision AI*, serta papan peringkat (*Leaderboard*) yang transparan dan kompetitif.

---

## ✨ Fitur Utama

### 1. 📱 Portal Karyawan (Advocate Hub)
* **Verifikasi Otomatis (Stage 1 - Link Postingan)**: Karyawan cukup memasukkan link postingan publik Instagram. Sistem melakukan inspeksi otomatis terhadap hashtag wajib `#IRS2026` dan kecocokan username.
* **Verifikasi Manual (Stage 2 - Server-Side Offline OCR)**: Untuk konten story atau profil private, karyawan dapat mengunggah screenshot bukti postingan. Sistem membaca teks screenshot secara instan menggunakan mesin OCR lokal tanpa mengirim data keluar dari server.
* **Anti-Duplikasi Post**: Pencegahan otomatis pengajuan ulang tautan postingan yang sama.
* **Leaderboard & Riwayat Poin**: Pantau peringkat pribadi di tingkat Cabang dan Kantor Wilayah, serta riwayat akumulasi poin secara terperinci.

### 2. 🤖 Gemini Vision AI Content Verification & Analytics
* **Analisis Konten Multimodal**: Menggunakan model **Gemini Vision AI** untuk memverifikasi keaslian elemen branding Pegadaian (logo, flyer promosi, produk Tabungan Emas/Gadai, seragam resmi, dll.) pada konten yang disubmit.
* **Dashboard AI Analitik Kanwil**: Menyajikan ringkasan total views, likes, comments, statistik advokator aktif per cabang, visualisasi postingan terbaik (*Top Posts*), dan rekomendasi performa.

### 3. 🛡️ Portal Admin (Kanwil & Pusat)
* **Panel Verifikasi Konten**: Meninjau submission manual dengan antarmuka interaktif, filter status (*Pending, Approved, Rejected*), dan catatan penolakan.
* **On-Demand Engagement Sync**: Sinkronisasi metrik interaksi (*likes*, *views*, *comments*) secara massal (*batch*) menggunakan Apify Instagram Scraper.
* **Manajemen Karyawan**: Kelola data karyawan per cabang, reset password, ubah role, dan audit keaktifan postingan.
* **Laporan & Ekspor Data**: Filter data laporan menurut rentang tanggal, cabang, dan status untuk diekspor ke format spreadsheet.

### 4. 🎨 Desain UI/UX Eksklusif
* **Identitas Pegadaian**: Skema warna modern *Emerald Green* dipadukan dengan aksen *Metallic Gold* yang elegan.
* **Micro-Animations & Glassmorphism**: Dilengkapi modal konfirmasi interaktif dengan animasi pantulan (*spring bounce*), *halo-pulse glow*, dan overlay animasi unggah bergaya mockup *floating smartphone*.

---

## 🛠 Arsitektur & Tech Stack

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend Framework** | [Next.js 16.3.1](https://nextjs.org/) (App Router) | Menggunakan Turbopack & React 19 untuk performa maksimal |
| **UI Styling** | Modern Vanilla CSS & CSS Variables | Glassmorphism, responsif di ponsel, tablet, dan desktop |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL) | Autentikasi aman SSR, RLS (*Row Level Security*), Realtime queries |
| **OCR Engine** | [Tesseract.js](https://tesseract.projectnaptha.com/) | Dijalankan offline di sisi server dengan model `tessdata` lokal |
| **Social Scraper** | [Apify Client](https://apify.com/) | Scraping metadata postingan & sinkronisasi metrik engagement |
| **Artificial Intelligence** | [Google Gemini AI](https://aistudio.google.com/) | Validasi keaslian materi promosi & AI Regional Analytics |

---

## 📂 Struktur Direktori Proyek

```plaintext
influencer-rising-star/
├── public/                     # Aset statis & logo
├── src/
│   ├── app/
│   │   ├── (auth)/login/       # Halaman Login
│   │   ├── (dashboard)/
│   │   │   ├── admin/          # Panel Admin Kanwil/Pusat
│   │   │   │   ├── analitik/   # Dashboard AI Analitik & Metrik Wilayah
│   │   │   │   ├── karyawan/   # Manajemen Karyawan & Sync Engagement
│   │   │   │   ├── laporan/    # Laporan & Rekapitulasi Konten
│   │   │   │   └── verifikasi/ # Verifikasi Approval Postingan
│   │   │   ├── karyawan/       # Portal Insan Pegadaian
│   │   │   │   ├── riwayat/    # Riwayat Submission & Poin
│   │   │   │   ├── sosmed/     # Hubungkan Akun Media Sosial
│   │   │   │   └── submission/ # Pengajuan Konten (Auto Scraper & OCR)
│   │   │   ├── leaderboard/    # Papan Peringkat Real-time
│   │   │   └── dashboard-shell.tsx # Navigasi & Shell Layout Utama
│   │   ├── globals.css         # Variabel tema, glassmorphism & style global
│   │   └── layout.tsx          # Root Layout
│   └── lib/
│       ├── gemini.ts           # Integrasi Google Gemini Vision AI
│       ├── supabase/           # Client & Server Supabase Helpers (SSR)
│       └── utils.ts            # Helper umum & format tanggal/angka
├── supabase/
│   └── migrations/             # Berkas SQL Skema & Kebijakan RLS
├── tessdata/                   # Bahasa model OCR offline (eng.traineddata.gz)
├── .env.example                # Template konfigurasi environment
├── next.config.ts              # Konfigurasi Next.js
├── package.json                # Dependensi & script proyek
└── tsconfig.json               # Konfigurasi TypeScript
```

---

## 🚀 Panduan Instalasi & Memulai

### 1. Prasyarat Sistem
Pastikan perangkat Anda telah terpasang:
* **Node.js** versi `20.x` atau lebih baru
* **npm** atau **pnpm** / **yarn**
* Akun proyek di [Supabase](https://supabase.com)

### 2. Clone Repositori
```bash
git clone https://github.com/dickygw/influencer-rising-star.git
cd influencer-rising-star
```

### 3. Instalasi Dependensi
```bash
npm install
```

### 4. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```
Lalu lengkapi nilai variabel pada `.env.local` sesuai dengan kredensial proyek Anda:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
APIFY_TOKEN="your-apify-token"
GEMINI_API_KEY="your-gemini-api-key"
```

### 5. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka browser dan akses: [http://localhost:3000](http://localhost:3000)

### 6. Build untuk Produksi
```bash
npm run build
npm run start
```

---

## 🔑 Konfigurasi Environment (`.env.local`)

| Variabel | Wajib / Opsional | Deskripsi |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Wajib** | URL instance proyek Supabase Anda. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Wajib** | Kunci anon/public API Supabase. |
| `APIFY_TOKEN` | *Opsional* | Token API Apify untuk scraper Instagram. Jika kosong, sistem otomatis berjalan pada mode mock scraper lokal. |
| `GEMINI_API_KEY` | *Opsional* | API Key Google Gemini untuk fitur AI Vision validation dan analitik. |

---

## 🗄 Skema Database & Migrasi Supabase

Untuk menginisialisasi database Supabase, jalankan seluruh file SQL yang ada pada folder `supabase/migrations/` secara berurutan di menu **SQL Editor** pada Supabase Dashboard Anda:

1. **`001_initial_schema.sql`** : Struktur tabel utama (`users`, `kanwil`, `cabang`, `posts`, `social_accounts`, `points_ledger`, `post_engagement_stats`, dll.) beserta trigger pemberian poin otomatis.
2. **`002_fix_post_engagement_stats_rls.sql`** : Kebijakan keamanan RLS untuk sinkronisasi metrik engagement.
3. **`003_fix_posts_delete_policy.sql`** : Penyesuaian hak akses penghapusan postingan bagi admin.
4. **`004_check_duplicate_post.sql`** : Fungsi keamanan validasi pencegahan duplikasi postingan.

---

## 👥 Hak Akses & Peran Pengguna (RBAC)

1. **Karyawan (`karyawan`)**:
   - Menautkan akun media sosial resmi.
   - Mengajukan konten promosi (Link Instagram / Upload Screenshot).
   - Melihat papan peringkat poin (Leaderboard) dan riwayat approval.

2. **Admin Kanwil (`admin_kanwil`)**:
   - Meninjau, menyetujui, atau menolak submission karyawan di wilayahnya.
   - Menjalankan sinkronisasi metrik engagement (*likes/views*).
   - Mengakses Dashboard AI Analitik Wilayah dan ekspor laporan berkala.
   - Mengelola data akun karyawan di bawah Kanwil terkait.

3. **Admin Pusat (`admin_pusat`)**:
   - Memantau performa agregat seluruh Kantor Wilayah di Indonesia.
   - Akses penuh terhadap seluruh data master, master cabang, dan konfigurasi sistem.

---

## 📄 Lisensi & Hak Cipta

Dikelola secara eksklusif untuk kepentingan internal **PT Pegadaian (Persero)**.  
Hak Cipta &copy; 2026 Tim Pengembang Program Influencer Rising Star.
