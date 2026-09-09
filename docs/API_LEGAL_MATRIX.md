# Matriks Legalitas API — Social Media Listening

**PT Pegadaian (Persero) — Divisi Contact Center**

| | |
|---|---|
| **Status** | Draft untuk review Legal & Procurement |
| **Versi** | 0.1 |
| **Tanggal** | 9 September 2026 |
| **Dokumen induk** | [`ARSITEKTUR_SOCIAL_LISTENING.md`](./ARSITEKTUR_SOCIAL_LISTENING.md) |

Dokumen ini menjadi acuan tim Legal dan Procurement dalam menilai kelayakan setiap sumber data, serta acuan tim TI dalam merencanakan integrasi.

> **Peringatan validitas.** Kebijakan API platform media sosial berubah cepat — perubahan besar pada X dan TikTok terjadi dalam 12 bulan terakhir. Seluruh angka kuota dan biaya di bawah ini **wajib diverifikasi ulang ke dokumentasi resmi platform** sebelum dijadikan dasar kontrak atau anggaran. Tanggal verifikasi terakhir: 9 September 2026.

---

## 1. Ringkasan Status Legal

| Platform | Cakupan aset sendiri | Cakupan konten publik pihak lain | Status |
|---|---|---|---|
| Instagram | ✅ Penuh, gratis | ⚠️ Terbatas pada mention/tag | **Legal** |
| Facebook | ✅ Penuh, gratis | ❌ Tidak tersedia | **Legal** |
| YouTube | ✅ Penuh, gratis | ✅ **Penuh** — komentar video publik siapa pun | **Legal** |
| Google Business Profile | ✅ Penuh, gratis | — | **Legal** |
| Google Play | ✅ Penuh, gratis | — | **Legal** |
| App Store | ✅ Penuh, gratis | — | **Legal** |
| TikTok | ✅ Video sendiri | ❌ **Hanya via vendor berlisensi** | **Legal dengan syarat** |
| X (Twitter) | ✅ Berbayar | ✅ Berbayar (pay-per-use) | **Legal, biaya variabel** |
| Reddit | — | ⚠️ Komersial perlu perjanjian | **Legal dengan syarat** |
| Berita / RSS / GDELT | — | ✅ Terbuka | **Legal** |
| **Scraping (Apify, dsb.)** | — | — | ❌ **DILARANG** |

---

## 2. Lapis 1 — API Resmi atas Aset Milik Pegadaian

### 2.1 Instagram Graph API

| Aspek | Detail |
|---|---|
| **Endpoint utama** | `GET /{ig-media-id}/comments` · `POST /{ig-comment-id}/replies` · `POST /{ig-comment-id}` (hide/unhide) · `DELETE /{ig-comment-id}` · `GET /{ig-user-id}/mentioned_media` |
| **Real-time** | Webhook field `comments`, `mentions`, `live_comments` |
| **Permission** | `instagram_basic`, `instagram_manage_comments`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement` |
| **Prasyarat** | Akun Instagram Business/Creator tertaut ke Facebook Page. Verifikasi Bisnis Meta |
| **Proses approval** | **App Review Meta — estimasi 2–6 minggu.** Perlu screencast demo, deskripsi use case, dan URL kebijakan privasi |
| **Kuota** | Rate limit berbasis Business Use Case (BUC), dihitung per Page |
| **Biaya** | Gratis |
| **Batasan penting** | Komentar pada media milik akun lain **tidak dapat diakses**, kecuali akun Pegadaian ditandai/di-mention |
| **Status** | ✅ Legal |

> **Jalur kritis.** App Review adalah item dengan lead time terpanjang di Fase 0. Ajukan di minggu pertama.

### 2.2 Facebook Graph API

| Aspek | Detail |
|---|---|
| **Endpoint utama** | `GET /{post-id}/comments` · `POST /{comment-id}/comments` · `POST /{comment-id}` (hide) |
| **Real-time** | Webhook Page, field `feed` |
| **Permission** | `pages_read_engagement`, `pages_manage_engagement`, `pages_show_list` |
| **Proses approval** | App Review Meta — dapat diajukan bersamaan dengan Instagram |
| **Biaya** | Gratis |
| **Batasan penting** | *Page Public Content Access* — yang memungkinkan pembacaan konten Page pihak lain — bersifat sangat dibatasi dan **tidak diasumsikan tersedia** dalam perencanaan ini |
| **Status** | ✅ Legal |

### 2.3 YouTube Data API v3

| Aspek | Detail |
|---|---|
| **Endpoint utama** | `commentThreads.list` (parameter `videoId` atau `allThreadsRelatedToChannelId`) · `comments.list` · `comments.insert` · `search.list` |
| **Permission** | OAuth 2.0 untuk operasi tulis; API key untuk pembacaan publik |
| **Proses approval** | Tidak perlu App Review. Cukup pembuatan project di Google Cloud Console |
| **Kuota** | 10.000 unit/hari. Biaya operasi: `commentThreads.list` = 1 unit, `search.list` = **100 unit**. Penambahan kuota dapat diajukan melalui formulir resmi |
| **Biaya** | Gratis |
| **Keunggulan** | **Satu-satunya sumber gratis yang dapat membaca komentar pada video publik milik siapa pun.** Sangat bernilai untuk memantau konten reviewer, kreator finansial, dan nasabah |
| **Catatan implementasi** | `search.list` mahal secara kuota. Gunakan daftar channel dan video yang dikurasi serta polling terjadwal, bukan pencarian kata kunci terus-menerus |
| **Status** | ✅ Legal |

### 2.4 Google Business Profile API

| Aspek | Detail |
|---|---|
| **Endpoint utama** | `accounts.locations.reviews.list` · `accounts.locations.reviews.updateReply` |
| **Permission** | OAuth 2.0, akun harus memiliki akses pengelolaan lokasi |
| **Proses approval** | **Permohonan akses API ke Google** — perlu diajukan terpisah, bukan aktivasi instan |
| **Biaya** | Gratis |
| **Nilai strategis** | Mencakup review pada seluruh outlet Pegadaian. Untuk jaringan ribuan cabang, ini kanal umpan balik pelanggan bervolume tinggi yang sering terabaikan |
| **Status** | ✅ Legal |

### 2.5 Google Play Developer API

| Aspek | Detail |
|---|---|
| **Endpoint utama** | `reviews.list` · `reviews.reply` |
| **Permission** | Service account dengan akses Play Console |
| **Biaya** | Gratis |
| **Batasan penting** | `reviews.list` hanya mengembalikan review **7 hari terakhir**. Sistem wajib melakukan polling terjadwal — kehilangan jendela berarti kehilangan data secara permanen |
| **Status** | ✅ Legal |

### 2.6 App Store Connect API

| Aspek | Detail |
|---|---|
| **Endpoint utama** | `customerReviews` · `customerReviewResponses` |
| **Permission** | API key App Store Connect (JWT) |
| **Biaya** | Gratis |
| **Alternatif cadangan** | RSS feed publik `itunes.apple.com/.../customerreviews/...json` — hanya baca, tanpa kemampuan membalas |
| **Status** | ✅ Legal |

### 2.7 TikTok Business API

| Aspek | Detail |
|---|---|
| **Cakupan** | **Hanya video milik akun TikTok Business Pegadaian** — daftar komentar dan balasan |
| **Prasyarat** | Akun TikTok Business, pendaftaran aplikasi di TikTok for Developers |
| **Biaya** | Gratis |
| **Batasan penting** | Tidak memberikan akses apa pun ke konten atau komentar publik pihak lain |
| **Status** | ✅ Legal untuk aset sendiri |

### 2.8 WhatsApp Business Cloud API

| Aspek | Detail |
|---|---|
| **Cakupan** | Pesan masuk melalui webhook, pengiriman balasan |
| **Permission** | WhatsApp Business Account terverifikasi, nomor terdaftar |
| **Biaya** | Per *conversation*, sesuai tarif Meta yang berlaku |
| **Status** | ✅ Legal |

---

## 3. Lapis 2 — Platform yang Memerlukan Vendor Berlisensi

### 3.1 TikTok — Konten Publik

| Aspek | Detail |
|---|---|
| **TikTok Research API** | ❌ **TIDAK MEMENUHI SYARAT.** Kelayakan terbatas pada institusi akademik dan nirlaba di AS, EEA, Inggris, Swiss, dan Brasil. TikTok secara eksplisit menyatakan pengguna komersial, pengiklan, dan kreator tidak memenuhi syarat |
| **Konsekuensi** | Tidak ada jalur mandiri yang sah untuk memantau TikTok publik |
| **Satu-satunya jalur legal** | Penyedia data berlisensi yang memiliki perjanjian resmi dengan TikTok |
| **Catatan risiko** | Penggunaan kredensial Research API untuk keperluan komersial berisiko pencabutan akses secara permanen |
| **Status** | ⚠️ **Hanya legal melalui vendor berlisensi** |

### 3.2 X (Twitter) API v2

| Aspek | Detail |
|---|---|
| **Endpoint utama** | `GET /2/tweets/search/recent` · filtered stream · pencarian balasan melalui filter `conversation_id` |
| **Model harga (per Februari 2026)** | **Pay-per-use** — ±US$0,005 per post dibaca, batas 2 juta pembacaan/bulan. Free tier **dihapus** untuk pendaftar baru |
| **Tier lama** | Basic US$200/bulan dan Pro US$5.000/bulan **ditutup untuk pendaftar baru**; hanya berlaku bagi pelanggan eksisting |
| **Enterprise** | Mulai kisaran US$42.000/bulan |
| **Implikasi anggaran** | Biaya bersifat variabel dan berbanding lurus dengan volume. Wajib dikendalikan melalui query filter ketat, sampling adaptif, dan budget cap di level aplikasi |
| **Alternatif** | Dapat diperoleh melalui vendor Lapis 2 bila lebih ekonomis pada volume tinggi — **bandingkan kedua opsi saat RFP** |
| **Status** | ✅ Legal, biaya variabel |

### 3.3 Reddit API

| Aspek | Detail |
|---|---|
| **Akses** | OAuth 2.0 |
| **Batasan** | Penggunaan komersial di atas 100 QPM memerlukan perjanjian komersial dengan Reddit |
| **Relevansi Indonesia** | Rendah. Prioritas rendah |
| **Status** | ⚠️ Legal dengan syarat perjanjian |

### 3.4 Persyaratan Vendor Berlisensi

Berlaku untuk seluruh kandidat pada RFP.

| Kriteria | Sifat |
|---|---|
| **Bukti perjanjian lisensi data resmi dengan setiap platform yang ditawarkan** | **Syarat gugur** |
| Terdaftar sebagai PSE di Komdigi | **Syarat gugur** untuk vendor Indonesia |
| Lokasi penyimpanan data dan komitmen residensi | **Syarat gugur** |
| Kualitas model sentimen Bahasa Indonesia — dibuktikan melalui uji sampel | Bobot penilaian tinggi |
| Kemampuan filter spam judi online | Bobot penilaian tinggi |
| Ketersediaan API/webhook untuk integrasi ke sistem Pegadaian | **Syarat gugur** |
| Sertifikasi keamanan (ISO 27001 atau setara) | Bobot penilaian tinggi |
| SLA ketersediaan layanan dan dukungan teknis berbahasa Indonesia | Bobot penilaian sedang |

> ⚠️ **Peringatan untuk tim Procurement.** Sebagian penyedia memasarkan data hasil scraping dalam kemasan dasbor yang tampak sah. Bila Pegadaian membeli produk semacam itu, risiko hukumnya berpindah ke Pegadaian — tidak hilang. Verifikasi lisensi platform, bukan sekadar profil perusahaan atau daftar klien.

**Kandidat global:** Sprinklr, Brandwatch/Cision, Talkwalker (Hootsuite), Meltwater, Emplifi.
**Kandidat Indonesia:** Ivosights (Ripple10), Nolimit Indonesia, Kazee Digital Indonesia, Binokular (Newstensity), Netray.

---

## 4. Lapis 3 — Sumber Terbuka

| Sumber | Akses | Biaya | Status |
|---|---|---|---|
| **GDELT 2.0** | API publik | Gratis | ✅ Legal |
| **RSS media Indonesia** | Feed publik | Gratis | ✅ Legal |
| **Google News RSS** | Feed publik | Gratis | ✅ Legal |

---

## 5. Sumber yang Dilarang

| Metode | Alasan |
|---|---|
| **Apify** dan layanan scraping sejenis | Melanggar Ketentuan Layanan platform. Mengambil data pribadi tanpa dasar pemrosesan yang sah — eksposur UU 27/2022 |
| **Endpoint tidak resmi di RapidAPI** | Umumnya merupakan scraping yang dikemas sebagai API. Status legal tidak dapat dipertanggungjawabkan |
| **Scraping berbasis Selenium/Puppeteer** | Melanggar Ketentuan Layanan. Berisiko pemblokiran IP dan tindakan hukum dari platform |
| **Pembelian dataset hasil scraping** | Memindahkan pelanggaran ke Pegadaian sebagai pengendali data |

> **Catatan terkait sistem eksisting.** Aplikasi *Influencer Rising Star* saat ini menggunakan Apify untuk scraping Instagram di `src/app/(dashboard)/karyawan/submission/actions.ts:146`, `src/app/(dashboard)/admin/karyawan/actions.ts:449`, serta `src/app/(dashboard)/admin/analitik/actions.ts:574` dan `:684`. Praktik ini tidak memenuhi standar legalitas yang ditetapkan untuk sistem baru, dan direkomendasikan untuk dimigrasikan ke Instagram Graph API resmi (Fase 4 pada dokumen arsitektur).

---

## 6. Checklist Fase 0 — Legal & Procurement

| # | Item | Penanggung jawab | Estimasi |
|---|---|---|---|
| 1 | Verifikasi Bisnis Meta | TI + Legal | 1–2 minggu |
| 2 | **App Review Meta** — `instagram_manage_comments`, `pages_manage_engagement` | TI | **2–6 minggu — jalur kritis** |
| 3 | Pembuatan project Google Cloud + aktivasi YouTube Data API v3 | TI | 1 hari |
| 4 | Permohonan akses Google Business Profile API | TI | 1–3 minggu |
| 5 | Pendaftaran TikTok for Developers (Business API) | TI | 1 minggu |
| 6 | Service account Google Play Console | TI | 1 hari |
| 7 | API key App Store Connect | TI | 1 hari |
| 8 | Konfirmasi status PSE Pegadaian (Lingkup Publik atau Privat) | Legal | 1–2 minggu |
| 9 | Konfirmasi ketentuan batas waktu penanganan pengaduan POJK 22/2023 | Compliance | 1 minggu |
| 10 | Penyusunan DPIA sesuai UU PDP | Legal + DPO | 2–3 minggu |
| 11 | Penerbitan RFP vendor Lapis 2 | Procurement | 2–4 minggu |
| 12 | Pendaftaran akun X API dan penetapan budget cap | TI + Keuangan | 1 minggu |

---

## 7. Referensi

Diverifikasi pada 9 September 2026. Perlu pengecekan ulang berkala.

- [TikTok Research Tools — Access and Eligibility](https://developers.tiktok.com/products/research-api/)
- [X (Twitter) API pricing 2026](https://www.socialcrawl.dev/blog/x-twitter-api-2026)
- [Instagram Graph API — Developer Guide 2026](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/)
- [POJK 22/2023 — Pelindungan Konsumen dan Masyarakat di Sektor Jasa Keuangan (OJK)](https://ojk.go.id/id/regulasi/Pages/Pelindungan-Konsumen-dan-Masyarakat-di-Sektor-Jasa-Keuangan.aspx)

Dokumentasi resmi platform yang wajib dirujuk saat implementasi:

- Meta for Developers — Instagram Platform & Graph API
- Google — YouTube Data API v3, Business Profile API, Play Developer API
- Apple — App Store Connect API
- TikTok for Developers — Business API
