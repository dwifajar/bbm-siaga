# BBM Siaga — Starter MVP

Aplikasi web responsif/PWA untuk informasi publik independen mengenai ketersediaan Pertalite, Solar, Pertamax, dan antrean SPBU.

## Penting sebelum dipublikasikan
- Halaman saat ini adalah **pratinjau UI dengan data simulasi**. Nama SPBU, jarak, stok, dan antrean bukan informasi aktual.
- Form laporan saat ini hanya mengubah state di browser. Belum dikirim ke server.
- Jangan mempublikasikan status stok aktual sebelum ada sumber laporan nyata dan sistem verifikasi.
- BBM Siaga bukan aplikasi resmi PT Pertamina (Persero), PT Pertamina Patra Niaga, atau anak perusahaan/afiliasinya.
- Gunakan nama/identitas visual independen; jangan menggunakan logo resmi Pertamina tanpa izin.

## Jalankan di laptop
Memerlukan Node.js 20.9+.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Integrasi Supabase
1. Buat proyek Supabase.
2. Buka SQL Editor dan jalankan `supabase/schema.sql`.
3. Salin `.env.example` menjadi `.env.local`.
4. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Implementasikan koneksi Supabase di server-side sebelum mengaktifkan laporan produksi.

Schema awal mencakup:
- `stations`: data lokasi SPBU.
- `station_fuel_products`: produk yang disediakan tiap SPBU.
- `fuel_reports`: laporan stok dan antrean dengan waktu kedaluwarsa, sumber, dan status verifikasi.
- `profiles`: profil dan peran pengguna.

## Aturan kualitas informasi yang disarankan
- Laporan memiliki waktu kirim dan masa berlaku.
- UI harus menampilkan status kedaluwarsa secara jelas.
- Jangan menyamakan "belum ada laporan" dengan "kosong".
- Jangan menganggap laporan komunitas sebagai data resmi.
- Tambahkan rate limit, pencegahan spam, moderasi, verifikasi petugas, dan audit log sebelum peluncuran publik.
- Gunakan geocoding/peta dengan ketentuan lisensi dan atribusi yang sesuai.
- Minta izin sebelum mengirim notifikasi lokasi atau menyimpan lokasi pengguna.

## Tahapan berikutnya
1. Tetapkan wilayah pilot dan sumber data.
2. Masukkan data SPBU dari sumber yang sah/terverifikasi.
3. Bangun autentikasi serta peran masyarakat, petugas SPBU, dan admin.
4. Sambungkan formulir laporan ke backend tepercaya.
5. Tambahkan peta, verifikasi laporan, filter kedaluwarsa, dan audit.
6. Uji keamanan RLS dan skenario data bertentangan sebelum deploy.


## Peta interaktif (pratinjau)
Peta memakai Leaflet + OpenStreetMap dan tidak membutuhkan API key untuk pratinjau lokal. Marker di sekitar Kediri adalah koordinat simulasi, bukan lokasi SPBU terverifikasi.
Setelah memperbarui file, jalankan `npm install`, lalu `npm run dev`. Jika server berjalan, hentikan dengan Ctrl+C terlebih dahulu.
