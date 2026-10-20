-- Add OpenStreetMap source metadata to stations and protect against re-import duplicates.
ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS osm_type TEXT,
  ADD COLUMN IF NOT EXISTS osm_id BIGINT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS data_source TEXT NOT NULL DEFAULT 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS idx_stations_osm_identity
  ON public.stations (osm_type, osm_id);

CREATE INDEX IF NOT EXISTS idx_stations_data_source
  ON public.stations (data_source);

CREATE INDEX IF NOT EXISTS idx_fuel_reports_station_fuel_reported
  ON public.fuel_reports (station_id, fuel_type, reported_at DESC);
