# BBM Siaga — Migrasi ke Cloudflare Workers + D1 (browser-only)

Paket ini menyiapkan aplikasi Next.js 15 yang sudah ada untuk berjalan pada Cloudflare Workers memakai OpenNext dan Cloudflare D1. Jangan deploy sebelum membuat database D1 dan memasukkan database ID yang benar ke `wrangler.jsonc`.

## File utama yang diganti/ditambahkan
- `package.json`: script build/deploy Cloudflare dan dependensi OpenNext/Wrangler.
- `wrangler.jsonc`: Worker `bbmsiaga` dan binding D1 bernama `DB`. Nilai `database_id` masih placeholder.
- `open-next.config.ts` dan `next.config.ts`: konfigurasi adapter OpenNext.
- `app/lib/d1.ts`: akses binding D1.
- `app/api/stations/route.ts`: pencarian SPBU terbatas; tidak melakukan full-table scan tanpa query.
- `app/api/reports/route.ts`: GET laporan untuk satu SPBU dan POST laporan langsung.
- `app/api/db-check/route.ts`: cek koneksi D1.
- `public/data/stations.json`: 5.657 lokasi OSM sebagai aset statis CDN, untuk mencegah pembacaan 5.657 baris D1 setiap refresh.
- `migrations/0001_initial_schema.sql` sampai `0007_import_osm_batch_06.sql`: skema dan impor lokasi ke D1. ID lokasi ditetapkan stabil dari 1 sampai 5.657 agar cocok dengan berkas JSON.
- `app/page.tsx` dan `app/station-map.tsx`: lokasi dimuat dari aset statis; laporan D1 dibaca hanya untuk SPBU terpilih/marker yang dibuka. Pembaruan laporan untuk SPBU pilihan berlangsung setiap 60 detik ketika tab aktif.

## Sebelum deploy
1. Buat database di Cloudflare Dashboard: Workers & Pages / Storage & databases → D1 SQL Database → Create Database. Nama: `bbmsiaga-db`.
2. Salin Database ID yang ditampilkan Cloudflare. Database ID bukan password, tetapi jangan bagikan kredensial atau API token.
3. Edit `wrangler.jsonc`, ganti `32668697-0a74-495e-8a94-ae8d277a76a6` dengan database ID sebenarnya.
4. Hubungkan repository GitHub `dwifajar/bbm-siaga` ke Workers Builds.
5. Konfigurasikan install command `npm install --no-audit --no-fund`, build command `npm run cf:build`, dan deploy command `npm run cf:migrate && npm run cf:deploy`.
6. Deploy. `cf:migrate` akan menjalankan migrasi `migrations/` di D1 remote. Lokasi 5.657 akan diimpor sekali, lalu tabel migrasi mencegah file yang sama dijalankan ulang.
7. Setelah deployment sukses, periksa `https://<worker>.workers.dev/api/db-check`, `https://<worker>.workers.dev/api/stations?q=Pertamina`, dan halaman utama.

## Catatan penting
- Jangan hapus proyek/DB Netlify selama Cloudflare belum aktif dan diuji. Netlify saat ini dijeda, jadi anggap Cloudflare sebagai migrasi baru; jangan mengandalkan DB Netlify untuk runtime.
- Data OSM dipakai untuk nama/lokasi saja; stok dan antrean tidak diisi dari OSM.
- Semua laporan pengguna langsung menjadi laporan terbaru untuk SPBU dan jenis BBM terkait; aplikasi menampilkan bahwa informasi berasal dari laporan pengguna, bukan konfirmasi resmi.
- Berkas `package-lock.json` lama di repositori bisa tidak cocok dengan dependensi OpenNext yang baru. Di Workers Builds set install command ke `npm install --no-audit --no-fund` (bukan `npm ci`) supaya npm memperbarui lockfile ketika memasang dependensi.
- Cloudflare Free bukan tanpa batas. Workers Free memiliki 100.000 request/hari dan D1 Free 5 juta baris dibaca/hari, 100.000 baris ditulis/hari, storage 5 GB total. Karena itu lokasi nasional ditempatkan dalam aset statis dan polling laporan dibatasi ke satu SPBU tiap 60 detik.
- Untuk Next.js 15 yang sudah ada, paket menggunakan OpenNext agar perubahan kompatibilitas lebih sedikit daripada mengganti toolchain aplikasi. Dokumentasi Cloudflare saat ini merekomendasikan vinext untuk proyek Next.js baru, tetapi vinext masih beta dan panduan inisialisasi existing app menargetkan Next.js 16; OpenNext adalah pilihan migrasi yang lebih konservatif untuk kode yang sekarang.
