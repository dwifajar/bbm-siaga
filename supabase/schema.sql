-- BBM Siaga: skema awal Supabase.
-- Jalankan di SQL Editor pada proyek Supabase baru.
-- Jangan memasukkan stok contoh sebagai data aktual.

create extension if not exists pgcrypto;

create type public.fuel_type as enum ('pertalite', 'solar', 'pertamax');
create type public.stock_status as enum ('tersedia', 'terbatas', 'kosong', 'belum_dikonfirmasi');
create type public.queue_status as enum ('pendek', 'sedang', 'panjang', 'belum_diketahui');
create type public.report_source as enum ('masyarakat', 'petugas_spbu', 'admin', 'integrasi_resmi');
create type public.user_role as enum ('masyarakat', 'petugas_spbu', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.user_role not null default 'masyarakat',
  created_at timestamptz not null default now()
);

create table public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text not null,
  province text not null default 'Jawa Timur',
  latitude double precision,
  longitude double precision,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_latitude check (latitude is null or latitude between -90 and 90),
  constraint valid_longitude check (longitude is null or longitude between -180 and 180)
);

create table public.station_fuel_products (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  fuel public.fuel_type not null,
  is_available_at_station boolean not null default true,
  created_at timestamptz not null default now(),
  unique (station_id, fuel)
);

create table public.fuel_reports (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  fuel public.fuel_type not null,
  stock public.stock_status not null,
  queue public.queue_status not null default 'belum_diketahui',
  queue_minutes_min integer,
  queue_minutes_max integer,
  source public.report_source not null default 'masyarakat',
  reporter_id uuid references auth.users(id) on delete set null,
  note text,
  is_verified boolean not null default false,
  verification_note text,
  reported_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '45 minutes'),
  created_at timestamptz not null default now(),
  constraint valid_queue_range check (
    (queue_minutes_min is null and queue_minutes_max is null)
    or (queue_minutes_min >= 0 and queue_minutes_max >= queue_minutes_min and queue_minutes_max <= 600)
  )
);

create index stations_city_idx on public.stations (city);
create index fuel_reports_latest_idx on public.fuel_reports (station_id, fuel, reported_at desc);
create index fuel_reports_expiry_idx on public.fuel_reports (expires_at);
create index fuel_reports_reporter_idx on public.fuel_reports (reporter_id);

alter table public.profiles enable row level security;
alter table public.stations enable row level security;
alter table public.station_fuel_products enable row level security;
alter table public.fuel_reports enable row level security;

-- Data SPBU aktif dan produk yang tersedia untuk dilihat publik.
create policy "Public can read active stations"
on public.stations for select
using (is_active = true);

create policy "Public can read station fuel products"
on public.station_fuel_products for select
using (exists (
  select 1 from public.stations s
  where s.id = station_id and s.is_active = true
));

-- Laporan terbaru dapat dibaca publik; kedaluwarsa tetap bisa dibaca untuk audit,
-- tetapi UI wajib menandainya sebagai kedaluwarsa dan tidak menganggapnya stok saat ini.
create policy "Public can read reports"
on public.fuel_reports for select
using (true);

-- Laporan anonim tidak diizinkan lewat kebijakan ini. Untuk MVP produksi,
-- gunakan Supabase Auth dan validasi/rate-limit melalui server action atau Edge Function.
create policy "Signed-in users can submit community reports"
on public.fuel_reports for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and source = 'masyarakat'
  and is_verified = false
);

create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

-- Sengaja tidak ada kebijakan update/delete publik.
-- Perubahan data SPBU, verifikasi, serta moderasi laporan dilakukan melalui backend tepercaya.
