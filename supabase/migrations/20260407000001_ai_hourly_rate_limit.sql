-- Rate limiting horaire : empêche un utilisateur de consommer >100k tokens/heure
-- À exécuter via SQL Editor Supabase si db push échoue
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ai_hourly_tokens integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_hourly_reset_at timestamptz DEFAULT now();
