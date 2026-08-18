# Product Requirement Document (PRD) Terkini
## Proyek: Influencer Rising Star (Employee Advocacy Sosmed)
### PT Pegadaian — Pilot Kanwil VI Kalimantan

---

## 1. Latar Belakang & Tujuan
PT Pegadaian meluncurkan program **Influencer Rising Star (IRS)** sebagai inisiatif *employee advocacy* untuk meningkatkan visibilitas brand di media sosial melalui akun pribadi karyawan. Karyawan bertindak sebagai duta merek (*brand advocate*) dengan membagikan konten edukasi, promosi, dan testimoni resmi. 

Aplikasi IRS digunakan untuk memantau, memverifikasi secara otomatis maupun manual, serta menghitung poin performa (*engagement metrics* seperti likes, comments, views) dari konten yang diposting oleh karyawan.

---

## 2. Peran Pengguna (Roles & Access Control)
Sistem membedakan akses berdasarkan empat peran utama yang diatur melalui PostgreSQL Row Level Security (RLS) di database Supabase:

1. **Karyawan**:
   * Menautkan akun media sosial (Instagram, TikTok, Facebook, X).
   * Mengajukan klaim postingan (input link untuk Verifikasi Otomatis atau upload screenshot untuk Verifikasi Manual).
   * Memantau akumulasi poin pribadi dan perincian riwayat ledger poin.
   * Melihat posisi peringkat di halaman Leaderboard.
2. **Admin Kanwil**:
   * Memvalidasi pengajuan manual yang masuk ke antrean *pending* di wilayahnya.
   * Melakukan sinkronisasi metrik engagement (*likes* dan *views*) karyawan di wilayah kerjanya.
   * Memantau keaktifan cabang dan mendownload laporan rekapitulasi performa (CSV/Excel).
3. **Admin Pusat / Super Admin**:
   * Mengelola aturan poin (*point rules*) dan modul pengajuan.
   * Mendaftarkan atau menonaktifkan pengguna (CRUD User Management).
4. **Manajemen (Read-Only)**:
   * Memantau performa leaderboard nasional dan rekapitulasi statistik di dashboard analisis.

---

## 3. Fitur Utama & Alur Kerja Fungsional

### 3.1. Pengelolaan Akun Media Sosial
* Karyawan dapat mendaftarkan *handle* media sosial mereka (misal: `@pegadaian_worker`).
* Sistem melakukan validasi keunikan kombinasi platform + handle untuk mencegah duplikasi klaim akun oleh karyawan lain.
* Pengikatan akun dilakukan secara deklaratif (tanpa OAuth penuh) demi kenyamanan pengguna dan simplifikasi sistem.

### 3.2. Modul Verifikasi Postingan (Dual-Verification System)

#### A. Verifikasi Otomatis (Stage 1 — Apify Scraper)
* **Mekanisme**: Pengguna memasukkan link URL postingan Instagram publik.
* **Proses Backend**:
  * Sistem memanggil modul scraper resmi `apify/instagram-post-scraper` menggunakan token yang aman di backend.
  * Sesuai dengan spesifikasi API Apify terbaru, parameter input wajib menyertakan array `username` untuk memvalidasi kepemilikan akun.
  * Skema request payload backend:
    ```json
    {
      "username": ["handle_instagram_terdaftar"],
      "directUrls": ["https://www.instagram.com/p/ID_POST/"],
      "resultsLimit": 1
    }
    ```
* **Kebijakan Fail-Safe & Penanganan Error**:
  * Jika `APIFY_TOKEN` diisi tetapi kuota habis/error, sistem langsung memunculkan pesan error berwarna merah **`"Apify Token Habis / Tidak Valid"`** dan membatalkan transaksi.
  * **Dynamic Mock Mode**: Jika token dikosongkan (lingkungan lokal/developer), sistem memperbolehkan query parameter (seperti `?likes=150&comments=10`) untuk menyimulasikan data scraper demi kelancaran demo presentasi.

#### B. Verifikasi Manual (Stage 2 — Local OCR Offline)
* **Mekanisme**: Pengguna mengunggah gambar screenshot postingan (misal: Instagram Story atau akun privat).
* **Proses Backend (Tesseract.js OCR)**:
  * Untuk menghilangkan biaya tagihan bulanan Google Cloud dan menjaga kerahasiaan data Pegadaian, sistem menggunakan engine **Tesseract.js** yang dieksekusi secara lokal/offline di dalam thread server Next.js.
  * Model bahasa **`eng.traineddata.gz`** disimpan secara lokal di dalam folder `./tessdata` untuk memotong koneksi internet CDN yang berisiko diblokir oleh firewall internal Pegadaian.
  * Teks gambar diekstrak, kemudian dicocokkan dengan kriteria kelulusan otomatis berikut:
    1. Teks harus memuat handle sosial media terdaftar milik karyawan bersangkutan (case-insensitive).
    2. Teks harus memuat hashtag wajib **`#IRS2026`** (case-insensitive).
  * Jika teks cocok, status postingan langsung diubah menjadi **`Approved`** dan poin dikreditkan secara instan (otomatisasi 100% tanpa campur tangan admin).
  * Jika deteksi teks gagal atau dicurigai manipulasi, status pengajuan masuk ke antrean **`Pending`** agar dapat ditinjau secara manual oleh Admin Kanwil.

### 3.3. Fitur On-Demand Sync Engagement (Admin)
* Admin Kanwil memiliki akses tombol **`🔄 Sync Engagement`** pada baris data karyawan di menu Admin.
* Fitur ini memicu Apify scraper untuk mengambil metrik engagement live (*likes, comments, views*) terbaru dari seluruh postingan karyawan yang berstatus `Approved`.
* Hasil metrik disimpan ke database untuk memperbarui snapshot leaderboard secara akurat.

---

## 4. Spesifikasi UI/UX & Animasi Premium
Aplikasi dirancang dengan estetika modern, responsif, dan menggunakan kombinasi warna harmoni Pegadaian (Hijau Emerald, Emas, dan Slate Gray).

### 4.1. Confirmation Dialog Kustom
Setiap tombol aksi yang krusial (seperti kirim postingan, hapus akun sosmed, verifikasi admin, dan sinkronisasi metrik) wajib memicu dialog konfirmasi kustom dengan spesifikasi:
* **Efek Transisi**: Animasi memantul elastis (*spring bounce-in*) berdurasi 300ms.
* **Backdrop**: Efek buram transparan (*glassmorphism backdrop blur 12px*).
* **Glow Ring**: Ikon status utama berdenyut (*pulsing halo waves*).
* **Aksen Warna**:
  * Hijau: Untuk aksi konfirmasi sukses/persetujuan.
  * Merah: Untuk aksi berbahaya (hapus data/tolak berkas).
  * Biru: Untuk pemberitahuan informasi / proses sinkronisasi.

### 4.2. Smartphone Upload Loading Overlay
Ditampilkan di halaman karyawan selama proses submit postingan untuk mengurangi kebingungan pengguna saat menanti pemrosesan API.
* **Visual Utama**: Mockup smartphone 3D yang melayang (*floating phone*) dengan layar yang mensimulasikan feed postingan meluncur naik (*slide up*).
* **Animasi**: Pesawat kertas terbang melengkung keluar dari layar handphone menuju awan di pojok kanan atas.
* **Teks Progres Dinamis**: Baris deskripsi di bawah progress bar akan berganti secara otomatis setiap 1,8 detik sesuai metode verifikasi (misal: *"Menghubungkan ke Instagram..."*, *"Mengekstrak teks dari gambar..."*, dll.).

---

## 5. Struktur Database & Skema Supabase
Berikut adalah tabel utama yang menyusun sistem database aplikasi:

* **`users`**: Informasi dasar karyawan (NIP, Nama, Jabatan, Cabang, Kanwil, Role, Status).
* **`social_accounts`**: Tautan username sosial media karyawan per platform (Instagram, TikTok, Facebook, X).
* **`posts`**: Data pengajuan postingan (URL, path file screenshot, status verifikasi, hasil tinjauan admin).
* **`post_engagement_stats`**: Menyimpan statistik metrik performa (*likes, comments, views, shares*).
* **`points_ledger`**: Ledger transaksi poin terperinci (*audit-trail* perolehan poin yang tidak dapat dimanipulasi).
* **`notifications`**: Log notifikasi untuk interaksi real-time antara Karyawan dan Admin.
* **`leaderboard_snapshot`**: Snapshot peringkat untuk performa query cepat.
* **`audit_log`**: Pencatatan aktivitas sensitif pengguna demi kepatuhan anti-fraud.

---

## 6. Spesifikasi Sistem & Deployment
* **Next.js Config**:
  * Pustaka `tesseract.js` harus dideklarasikan di `serverExternalPackages` pada berkas `next.config.ts`.
  * Batas ukuran payload request (*body size limit*) dinaikkan menjadi `10mb` untuk mengakomodasi pengunggahan gambar resolusi tinggi.
* **Supabase Storage**:
  * Menggunakan bucket privat bernama `screenshots` untuk menyimpan berkas bukti gambar, dengan kebijakan pembatasan format (`.png`, `.jpg`, `.jpeg`, `.webp`) dan batas file 5MB.

---
*PRD ini telah diselaraskan dengan seluruh fitur yang telah dideploy di repositori lokal per Juli 2026.*
