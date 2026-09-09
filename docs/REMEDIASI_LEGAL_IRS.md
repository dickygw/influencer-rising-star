# Tahapan Remediasi Legalitas — Influencer Rising Star

**PT Pegadaian (Persero)**

| | |
|---|---|
| **Status** | Draft untuk pembahasan internal |
| **Versi** | 0.1 |
| **Tanggal** | 9 September 2026 |
| **Prasyarat untuk** | Penambahan fitur Social Listening ke dalam IRS |

---

## 1. Mengapa dokumen ini ada

Keputusan terbaru: fitur pemantauan komentar media sosial akan dibangun **sebagai fitur di dalam aplikasi IRS**, bukan sebagai aplikasi terpisah.

Konsekuensinya, remediasi legalitas IRS berubah status — dari "Fase 4, dikerjakan paralel" menjadi **prasyarat yang harus selesai lebih dulu**. Alasannya bukan formalitas: kedua fitur akan berbagi satu Meta App, satu App Review, satu basis data, dan satu DPIA. Menambahkan pemrosesan data publik ke atas fondasi yang belum sah akan memperbesar pelanggaran, bukan menyembunyikannya.

> **Catatan atas keputusan ini.** Menggabungkan kedua fitur menaikkan beban kepatuhan secara signifikan. IRS saat ini hanya memproses data karyawan sendiri — subjek data yang punya hubungan kerja dengan Pegadaian. Fitur listening menambahkan **data pribadi masyarakat umum** yang tidak punya hubungan apa pun dengan Pegadaian, dengan dasar pemrosesan yang berbeda dan hak subjek data yang lebih sulit dipenuhi. Ini tetap bisa dikerjakan dan rencana di bawah mengakomodasinya, tetapi DPIA harus mencakup kedua kelompok subjek data secara terpisah. Sisi baiknya: satu Meta App dan satu App Review dapat melayani keduanya, sehingga jalur perizinan justru lebih efisien.

---

## 2. Temuan struktural: ini bukan penggantian API biasa

Ini bagian terpenting dari seluruh dokumen.

Mengganti Apify dengan Instagram Graph API **bukan penukaran satu fungsi dengan fungsi lain**. API resmi Meta hanya dapat membaca akun yang **memberi izin secara eksplisit melalui OAuth**. Konsekuensinya menyentuh produk, bukan hanya kode:

| | Kondisi sekarang | Setelah remediasi |
|---|---|---|
| Cara karyawan mendaftarkan akun | Mengetik username di form | **Login OAuth ke Instagram** dan memberi izin ke aplikasi Pegadaian |
| Jenis akun yang didukung | Semua akun publik | **Hanya akun Professional** (Business atau Creator) |
| Bukti kepemilikan akun | Pencocokan string `ownerUsername === handle` | **Access token itu sendiri** — kepemilikan terbukti secara kriptografis |
| Akun personal | Bisa di-scrape | **Tidak dapat dibaca oleh API mana pun secara legal** |

Perubahan bukti kepemilikan ini bukan sekadar efek samping — ini **perbaikan keamanan yang nyata**. PRD saat ini menyatakan pendaftaran akun dilakukan "tanpa OAuth penuh", sehingga karyawan dapat mendaftarkan handle milik siapa pun dan sistem tidak punya cara membuktikan sebaliknya. Setelah remediasi, hal itu tidak lagi mungkin.

### 2.1 Kabar baik: tidak perlu Facebook Page

Verifikasi per 9 September 2026: **Business Login for Instagram** memungkinkan autentikasi langsung ke Instagram **tanpa memerlukan Facebook Page tertaut**, untuk akun Business maupun Creator. Karyawan cukup mengubah akun pribadinya menjadi akun Professional — gratis, beberapa ketukan di aplikasi Instagram, dan tidak memaksa mereka membuat akun Facebook.

Scope yang berlaku saat ini (scope lama sudah dihentikan sejak 27 Januari 2025):

| Scope | Kegunaan di IRS |
|---|---|
| `instagram_business_basic` | Profil, daftar media, `caption`, `like_count`, `comments_count`, `media_url`, `permalink`, `timestamp`, `followers_count` |
| `instagram_business_manage_insights` | Metrik tayangan/views — dibutuhkan untuk konten video dan Reels |
| `instagram_business_manage_comments` | **Fitur listening** — baca, balas, sembunyikan komentar di akun resmi Pegadaian |

### 2.2 Konsekuensi yang harus diterima manajemen

Sebagian karyawan tidak akan bersedia atau tidak dapat mengubah akunnya menjadi Professional. **Mereka tidak bisa dilayani jalur otomatis, dan tidak ada API legal mana pun yang bisa mengubah itu.**

Jalur untuk mereka adalah **verifikasi manual dengan unggah screenshot** — yang sudah ada di IRS hari ini (`verifyScreenshotWithTesseract`). Jalur ini legal karena karyawan mengunggah materinya sendiri secara sukarela. Rencana ini mempertahankannya sebagai jalur setara, bukan sebagai jalur kelas dua.

---

## 3. Inventaris pelanggaran

Scraping adalah yang paling menonjol, tetapi bukan satu-satunya.

| # | Temuan | Lokasi | Dasar masalah | Prioritas |
|---|---|---|---|---|
| 1 | Scraping Instagram via Apify pada submission karyawan | `karyawan/submission/actions.ts:146` | Melanggar Ketentuan Layanan Meta; pengambilan data pribadi tanpa dasar pemrosesan | **Kritis** |
| 2 | Scraping batch engagement se-kanwil | `admin/analitik/actions.ts:684` | Sama, dengan volume jauh lebih besar | **Kritis** |
| 3 | Scraping biografi dan `externalUrl` akun karyawan | `admin/analitik/actions.ts:574` | Sama | **Kritis** |
| 4 | Scraping engagement per karyawan | `admin/karyawan/actions.ts:449` | Sama | **Kritis** |
| 5 | Tidak ada mekanisme persetujuan (consent) karyawan | Alur *lazy registration* dari unggahan CSV admin | UU PDP: karyawan didaftarkan oleh admin tanpa pernyataan persetujuan atas pemrosesan data media sosialnya | **Kritis** |
| 6 | Transfer lintas negara ke Google Gemini | `src/lib/gemini.ts:22` | Gambar dan caption karyawan dikirim ke `generativelanguage.googleapis.com`. UU PDP Pasal 56 mengatur syarat transfer data pribadi ke luar wilayah Indonesia | **Tinggi** |
| 7 | Residensi data | Supabase + Vercel | PP 71/2019 dan Permenkominfo 5/2020 — status PSE Pegadaian perlu dikonfirmasi | **Tinggi** |
| 8 | Tidak ada kebijakan privasi, retensi, dan mekanisme hak subjek data | — | UU PDP | **Tinggi** |
| 9 | Data historis hasil scraping masih tersimpan | Tabel `posts`, `post_engagement_stats`, `social_accounts`, bucket `screenshots` | Data yang diperoleh secara tidak sah tidak menjadi sah hanya karena waktu berlalu | **Tinggi** |

### 3.1 Temuan integritas yang ikut terangkat

Tiga hal berikut bukan pelanggaran hukum, tetapi ditemukan saat penelusuran dan berdampak pada keandalan sistem poin:

- **Mock mode memalsukan data bila `APIFY_TOKEN` tidak ada** (`submission/actions.ts:244`). Fungsi mengembalikan `success: true` dengan caption, likes, dan views karangan. Bila variabel ini pernah hilang di produksi, poin akan diberikan atas postingan yang tidak pernah diverifikasi.
- **Gemini gagal-terbuka** (`gemini.ts:23`). Tanpa `GEMINI_API_KEY`, fungsi mengembalikan `isValidPegadaianContent: true`. Validasi konten terlewati diam-diam.
- **Rate limiter login berbasis Map di memori** (`login/actions.ts`). Pada Vercel yang serverless, setiap instance punya Map sendiri, sehingga batas 5 percobaan per 15 menit tidak benar-benar berlaku.

Ketiganya ditangani di Fase 0 karena murah dan berisiko tinggi.

---

## 4. Tahapan remediasi

Enam fase. Fase 0, 1, dan 2 berjalan paralel; Fase 1 adalah jalur kritis karena durasinya ditentukan pihak luar.

### Fase 0 — Hentikan pelanggaran yang sedang berjalan
**Durasi: 1 minggu · Dapat dimulai hari ini · Tidak menunggu apa pun**

Tujuannya menghentikan pendarahan, bukan menyelesaikan masalah. Seluruhnya perubahan kecil dan berisiko rendah.

| Tindakan | File |
|---|---|
| Nonaktifkan seluruh pemanggilan Apify di belakang feature flag `ENABLE_APIFY=false`, default mati | Keempat lokasi pada tabel Bagian 3 |
| Arahkan submission baru ke **jalur manual** (unggah screenshot) yang sudah legal | `karyawan/submission/` |
| Hentikan tombol sinkronisasi batch di panel admin | `admin/analitik/`, `admin/karyawan/` |
| Buat mock mode **gagal-tertutup** — lempar error bila `NODE_ENV === 'production'` | `submission/actions.ts:244` |
| Buat Gemini **gagal-tertutup** — kembalikan status "perlu verifikasi manual", bukan `true` | `gemini.ts:23` |
| Tambahkan validasi environment variable dengan **Zod** saat boot | Modul baru `src/lib/env.ts` |
| Ganti rate limiter login ke penyimpanan bersama (tabel Postgres atau Upstash Redis) | `login/actions.ts` |

**Hasil akhir fase:** aplikasi tetap berfungsi penuh lewat jalur manual, dan tidak ada lagi permintaan scraping yang keluar.

### Fase 1 — Perizinan Meta
**Durasi: 2–6 minggu · JALUR KRITIS · Mulai di hari yang sama dengan Fase 0**

Durasi ditentukan Meta, bukan oleh tim. Setiap hari penundaan di sini menunda seluruh proyek.

1. Buat Meta App bertipe **Business**, ajukan **Business Verification** atas nama PT Pegadaian (perlu dokumen legal perusahaan).
2. Konfigurasikan produk **Instagram** dengan metode **Business Login for Instagram**.
3. Siapkan kelengkapan wajib App Review:
   - **URL Kebijakan Privasi** yang dapat diakses publik (hasil Fase 2)
   - **Data Deletion Request Callback** — endpoint wajib, akan dibangun di Fase 3
   - **Deauthorize Callback** — dipanggil saat karyawan mencabut izin
   - **Screencast demo** yang memperlihatkan alur login dan penggunaan setiap permission
   - Akun uji Instagram Professional
4. Ajukan review untuk scope: `instagram_business_basic`, `instagram_business_manage_insights`, dan `instagram_business_manage_comments`.

> Ajukan ketiga scope dalam **satu pengajuan**. Mengajukan scope listening belakangan berarti mengulang siklus review 2–6 minggu untuk kedua kalinya.

### Fase 2 — Fondasi hukum
**Durasi: 2–4 minggu · Paralel dengan Fase 1**

| Item | Penanggung jawab | Keterangan |
|---|---|---|
| **DPIA** mencakup dua kelompok subjek data: karyawan (IRS) dan masyarakat umum (listening) | Legal + DPO | Wajib sebelum go-live |
| **Kebijakan privasi** yang dapat diakses publik | Legal | Juga menjadi syarat App Review Meta |
| **Mekanisme persetujuan eksplisit** menggantikan lazy registration diam-diam | TI + Legal | Karyawan harus menyatakan setuju sebelum data media sosialnya diproses, dan dapat menariknya kembali |
| **Kebijakan retensi** dan prosedur hak subjek data | Legal | Usulan: data engagement 24 bulan, riwayat poin 5 tahun |
| Konfirmasi **status PSE** Pegadaian | Legal | Menentukan apakah Supabase/Vercel dapat dipertahankan |
| Keputusan atas **transfer data ke Google** | Legal + TI | Tiga opsi di Bagian 5 |
| Keputusan atas **data historis hasil scraping** | Legal + DPO | Usulan di Bagian 6 |

### Fase 3 — Implementasi teknis
**Durasi: 3–4 minggu · Baru dimulai setelah App Review Fase 1 disetujui**

Komponen baru:

```
src/lib/env.ts                              validasi Zod (sudah dari Fase 0)
src/lib/instagram/client.ts                 pembungkus Graph API
src/lib/instagram/token-vault.ts            simpan/ambil token terenkripsi
src/lib/instagram/refresh.ts                perpanjangan token
src/app/api/auth/instagram/start/route.ts   mulai alur OAuth
src/app/api/auth/instagram/callback/route.ts tukar code → token, state + PKCE
src/app/api/meta/data-deletion/route.ts     callback wajib Meta
src/app/api/meta/deauthorize/route.ts       callback wajib Meta
src/app/api/cron/refresh-tokens/route.ts    cron harian
supabase/migrations/010_instagram_oauth.sql skema baru
```

**Migrasi skema (`010`)** — tabel baru `social_connections`:

| Kolom | Catatan |
|---|---|
| `user_id`, `platform`, `ig_user_id`, `username` | identitas koneksi |
| `access_token_encrypted` | **pgcrypto**, jangan pernah plaintext |
| `token_expires_at`, `last_refreshed_at` | token long-lived berlaku **60 hari**, dapat diperpanjang setelah 24 jam, dan hangus setelah 60 hari tanpa penggunaan |
| `scopes[]` | scope yang benar-benar diberikan karyawan |
| `consent_version`, `consented_at`, `revoked_at` | jejak persetujuan untuk pembuktian kepatuhan |

Tambahkan RLS pada tabel ini mengikuti pola yang sudah ada di `001_initial_schema.sql`. Kolom `handle` pada `social_accounts` dipertahankan hanya sebagai tampilan, tidak lagi sebagai dasar verifikasi.

**Penggantian fungsi.** Seluruh field yang dipakai IRS hari ini punya padanan resmi:

| Field lama (Apify) | Sumber resmi |
|---|---|
| `ownerUsername` | Tidak diperlukan lagi — kepemilikan dijamin oleh token |
| `caption` | `caption` pada objek media |
| `likesCount` | `like_count` |
| `commentsCount` | `comments_count` |
| `videoPlayCount` / `playCount` | Metrik insights, perlu `instagram_business_manage_insights` |
| `displayUrl` | `media_url` atau `thumbnail_url` |
| `shortCode` | Diturunkan dari `permalink` |

Alur verifikasi baru pada `karyawan/submission/actions.ts`:

1. Ambil koneksi Instagram karyawan; bila belum ada, arahkan ke jalur manual.
2. Panggil `/me/media` dengan token karyawan, cari media yang `permalink`-nya cocok dengan URL yang dikirim.
3. Media tidak ditemukan berarti bukan milik karyawan tersebut — **tidak ada lagi pencocokan string yang bisa dikelabui**.
4. Validasi hashtag `#IRS2026` dari `caption`.
5. Ambil metrik, simpan, berikan poin — logika poin, kuota harian, dan audit log tidak berubah.

**Yang dihapus:** dependensi `apify-client` dari `package.json`, variabel `APIFY_TOKEN`, dan seluruh blok mock mode.

### Fase 4 — Migrasi pengguna
**Durasi: 3–4 minggu · Berjalan bersamaan dengan operasional normal**

1. Umumkan perubahan beserta alasannya — sampaikan terus terang bahwa ini pemenuhan ketentuan Meta dan UU PDP.
2. Sediakan panduan singkat mengubah akun Instagram menjadi Professional.
3. Buka periode transisi: kedua jalur (OAuth dan manual) berjalan bersamaan.
4. Pantau tingkat adopsi per kanwil.
5. Tutup jalur Apify secara permanen — kodenya sudah dihapus di Fase 3.

**Ukuran keberhasilan:** persentase karyawan aktif yang telah menghubungkan akun. Angka rendah bukan kegagalan proyek, melainkan sinyal bahwa jalur manual perlu dipermudah.

### Fase 5 — Penambahan fitur Social Listening
**Baru dimulai setelah Fase 0–4 tuntas**

Mengikuti rancangan pada [`ARSITEKTUR_SOCIAL_LISTENING.md`](./ARSITEKTUR_SOCIAL_LISTENING.md), dengan penyesuaian karena kini menjadi modul di dalam IRS:

- Koneksi OAuth **akun resmi Pegadaian** (berbeda dari koneksi akun karyawan) dengan scope `instagram_business_manage_comments`
- Webhook komentar real-time
- Redaksi PII sebelum penyimpanan
- Sentimen IndoBERT dan filter spam judi online
- Modul inbox dan SLA untuk Contact Center
- **Pemisahan tegas RBAC**: agent Contact Center tidak boleh melihat data karyawan IRS, dan admin IRS tidak boleh melihat data komentar masyarakat

---

## 5. Keputusan yang perlu diambil manajemen

Empat hal berikut tidak dapat diputuskan oleh tim teknis.

### 5.1 Transfer data ke Google Gemini

| Opsi | Konsekuensi |
|---|---|
| **Pindah ke Vertex AI region Jakarta** | Pemrosesan tetap di Indonesia, tersedia jaminan kontraktual bahwa data tidak dipakai melatih model. Perlu penyesuaian kode dan biaya |
| **Hapus fitur validasi visual AI** | Paling sederhana dan paling aman. Verifikasi kembali sepenuhnya ke OCR lokal dan admin |
| **Pertahankan Gemini apa adanya** | Memerlukan dasar transfer lintas negara yang sah menurut UU PDP Pasal 56. **Tidak direkomendasikan** |

### 5.2 Residensi data

Bergantung pada status PSE Pegadaian. Bila tergolong Lingkup Publik, Supabase dan Vercel kemungkinan tidak memenuhi syarat dan diperlukan migrasi ke region Indonesia.

### 5.3 Perlakuan atas data historis

**Usulan:** hapus seluruh metrik engagement hasil scraping, pertahankan riwayat poin dan status verifikasi karyawan. Alasannya, poin adalah hak karyawan yang sudah melekat, sedangkan angka likes dan views hasil scraping tidak punya nilai operasional yang sepadan dengan risikonya. Gambar Instagram yang di-cache ke bucket `screenshots` dihapus dan diambil ulang melalui API resmi setelah karyawan terhubung.

Keputusan akhir ada pada Legal dan DPO.

### 5.4 Konsekuensi cakupan

Karyawan dengan akun personal yang menolak beralih ke akun Professional hanya dapat dilayani jalur manual. Manajemen perlu menerima hal ini sebagai batasan yang melekat, bukan sebagai persoalan yang bisa diselesaikan dengan pilihan teknis lain.

---

## 6. Ringkasan jadwal

| Fase | Durasi | Ketergantungan |
|---|---|---|
| 0 — Hentikan pelanggaran | 1 minggu | Tidak ada — mulai hari ini |
| 1 — Perizinan Meta | 2–6 minggu | **Jalur kritis** — mulai bersamaan Fase 0 |
| 2 — Fondasi hukum | 2–4 minggu | Paralel dengan Fase 1 |
| 3 — Implementasi teknis | 3–4 minggu | Menunggu persetujuan Fase 1 |
| 4 — Migrasi pengguna | 3–4 minggu | Setelah Fase 3 |
| 5 — Fitur Social Listening | Sesuai dokumen arsitektur | Setelah Fase 0–4 |

**Perkiraan hingga IRS berstatus legal sepenuhnya: 8–13 minggu**, bergantung pada lama App Review Meta.

Perlu ditegaskan: **status "berhenti melanggar" tercapai di akhir minggu pertama** melalui Fase 0. Sisa waktu adalah pemulihan fungsionalitas otomatis di atas fondasi yang sah.

---

## 7. Langkah pertama minggu ini

1. Setujui Fase 0 dan mulai eksekusinya — tidak menunggu keputusan lain.
2. Kumpulkan dokumen legal PT Pegadaian untuk Business Verification Meta.
3. Jadwalkan pertemuan dengan Legal dan Compliance untuk DPIA serta konfirmasi status PSE.
4. Putuskan arah untuk Gemini (Bagian 5.1).
5. Tunjuk penanggung jawab App Review — perannya menunggu dan menanggapi Meta, dan keterlambatan respons memperpanjang siklus review.

---

## Lampiran

- [`ARSITEKTUR_SOCIAL_LISTENING.md`](./ARSITEKTUR_SOCIAL_LISTENING.md) — rancangan fitur Social Listening
- [`API_LEGAL_MATRIX.md`](./API_LEGAL_MATRIX.md) — matriks legalitas API per platform

Status kebijakan Meta diverifikasi pada 9 September 2026. Scope Instagram berubah pada 27 Januari 2025 — verifikasi ulang ke dokumentasi resmi Meta sebelum implementasi.
