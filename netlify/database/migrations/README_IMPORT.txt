BBM Siaga — Import lokasi BBM dari OpenStreetMap

Isi:
- 003_add_osm_metadata.sql: menambah ID sumber OSM, brand, sumber data, dan indeks laporan terbaru.
- 004–009_import_osm_spbu_batch_XX.sql: memasukkan 5.657 objek lokasi dari export(1).geojson secara bertahap.
- app/page.tsx: halaman tanpa admin, pembaruan otomatis, dan paginasi 20 SPBU per halaman.
- app/station-map.tsx: peta membaca koordinat dari database (bukan marker simulasi).
- app/api/stations/route.ts dan app/api/reports/route.ts: endpoint API untuk data & laporan langsung.

Syarat:
1. Repository harus sudah punya `netlify/database/migrations/001_initial_schema.sql` dan `002_recreate_bbm_tables.sql`, serta dependensi `@netlify/database`.
2. File SQL 003–009 diunggah ke `netlify/database/migrations/` dan di-commit bersama-sama dalam satu commit.
3. Upload melalui browser: masuk folder `netlify/database/migrations` di GitHub, klik Add file → Upload files, lalu pilih semua file SQL dari folder hasil ekstraksi.
4. Upload `app/page.tsx`, `app/station-map.tsx`, dan dua API route dari folder yang sesuai. Ganti isi file yang sudah ada; jangan membuat nama file route baru.
5. File migrations akan dijalankan pada database branch yang dilayani deploy tersebut. Branch fitur adalah branch dalam proyek Netlify yang sama, bukan proyek Netlify kedua. Setelah uji sukses, merge ke `main` akan menjalankan migrasi pada database production.
6. Jangan edit file migrasi setelah Netlify menandainya applied; gunakan migrasi baru untuk koreksi.
7. Data ini hanya lokasi. OSM mungkin belum mencakup semua SPBU dan beberapa objek bertumpuk/berdekatan karena node/way/relation. Stok dan antrean berasal dari laporan pengguna.
8. Website mencantumkan atribusi © OpenStreetMap contributors serta https://www.openstreetmap.org/copyright.
