-- BBM Siaga production schema for Cloudflare D1 (SQLite).
-- Location records are sourced from OpenStreetMap. Stock/queue comes only from user reports.
CREATE TABLE IF NOT EXISTS stations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  osm_type TEXT,
  osm_id INTEGER,
  brand TEXT,
  data_source TEXT NOT NULL DEFAULT 'manual',
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stations_osm_identity
  ON stations (osm_type, osm_id);
CREATE INDEX IF NOT EXISTS idx_stations_city ON stations (city);
CREATE INDEX IF NOT EXISTS idx_stations_name ON stations (name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS station_fuel_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('Pertalite', 'Solar', 'Pertamax')),
  availability TEXT NOT NULL DEFAULT 'unknown'
    CHECK (availability IN ('available', 'limited', 'unavailable', 'unknown')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (station_id, fuel_type)
);

CREATE TABLE IF NOT EXISTS fuel_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('Pertalite', 'Solar', 'Pertamax')),
  availability TEXT NOT NULL
    CHECK (availability IN ('available', 'limited', 'unavailable', 'unknown')),
  queue_level TEXT NOT NULL DEFAULT 'unknown'
    CHECK (queue_level IN ('none', 'short', 'medium', 'long', 'unknown')),
  notes TEXT,
  reporter_name TEXT,
  reported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fuel_reports_station_fuel_latest
  ON fuel_reports (station_id, fuel_type, reported_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_reports_reported_at
  ON fuel_reports (reported_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO app_settings (key, value)
VALUES ('disclaimer', '"BBM Siaga adalah aplikasi informasi publik independen dan bukan aplikasi resmi Pertamina atau afiliasinya."');
