-- Idempotency table for Stripe webhook events
-- Prevents duplicate processing when Stripe retries an already-handled event
create table if not exists public.stripe_events_processed (
  event_id     text        primary key,
  processed_at timestamptz default now()
);
