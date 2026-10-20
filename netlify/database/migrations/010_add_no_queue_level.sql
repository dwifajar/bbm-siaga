-- Tambahkan pilihan antrean "none" agar kondisi tidak antre berbeda
-- dari antrean pendek. Netlify akan menerapkan migrasi ini saat deploy.
ALTER TABLE public.fuel_reports
  DROP CONSTRAINT IF EXISTS fuel_reports_queue_level_check;

ALTER TABLE public.fuel_reports
  ADD CONSTRAINT fuel_reports_queue_level_check
  CHECK (queue_level IN ('none', 'short', 'medium', 'long', 'unknown'));
