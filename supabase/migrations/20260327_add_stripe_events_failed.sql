-- Table pour stocker les événements Stripe dont la mise à jour DB a échoué
-- Permet un traitement manuel sans perdre les données Stripe
CREATE TABLE IF NOT EXISTS public.stripe_events_failed (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      text        NOT NULL,
  event_type    text        NOT NULL,
  customer_id   text,
  error_message text        NOT NULL,
  event_data    jsonb,
  created_at    timestamptz DEFAULT now()
);

-- Activer RLS — aucune policy = table accessible uniquement via service role
ALTER TABLE public.stripe_events_failed ENABLE ROW LEVEL SECURITY;
