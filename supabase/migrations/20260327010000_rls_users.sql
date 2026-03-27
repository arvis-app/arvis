-- ── RLS table users ──────────────────────────────────────────────────────────
-- Chaque utilisateur ne peut lire et modifier que sa propre ligne.
-- Le service role (Edge Functions, Stripe webhook) contourne le RLS par défaut.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Pas de DELETE policy : un utilisateur ne peut pas supprimer son propre compte via le client.
