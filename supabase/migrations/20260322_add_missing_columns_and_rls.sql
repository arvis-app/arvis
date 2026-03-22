-- ── Colonnes manquantes dans events ─────────────────────────────────────────
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS type text DEFAULT 'task';

-- ── Colonnes manquantes dans bausteine ──────────────────────────────────────
ALTER TABLE public.bausteine ADD COLUMN IF NOT EXISTS is_fav boolean DEFAULT false;

-- ── Colonnes manquantes dans notes ──────────────────────────────────────────
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS file_type text DEFAULT 'note';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS storage_path text;

-- ── Colonnes manquantes dans users (adresse) ────────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS strasse text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hausnummer text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plz text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stadt text;

-- ── RLS : activer sur toutes les tables ─────────────────────────────────────
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bausteine ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- ── Policies events ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "events_select" ON public.events;
DROP POLICY IF EXISTS "events_insert" ON public.events;
DROP POLICY IF EXISTS "events_update" ON public.events;
DROP POLICY IF EXISTS "events_delete" ON public.events;
CREATE POLICY "events_select" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "events_update" ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "events_delete" ON public.events FOR DELETE USING (auth.uid() = user_id);

-- ── Policies patients ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "patients_select" ON public.patients;
DROP POLICY IF EXISTS "patients_insert" ON public.patients;
DROP POLICY IF EXISTS "patients_update" ON public.patients;
DROP POLICY IF EXISTS "patients_delete" ON public.patients;
CREATE POLICY "patients_select" ON public.patients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "patients_insert" ON public.patients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "patients_update" ON public.patients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "patients_delete" ON public.patients FOR DELETE USING (auth.uid() = user_id);

-- ── Policies bausteine ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "bausteine_select" ON public.bausteine;
DROP POLICY IF EXISTS "bausteine_insert" ON public.bausteine;
DROP POLICY IF EXISTS "bausteine_update" ON public.bausteine;
DROP POLICY IF EXISTS "bausteine_delete" ON public.bausteine;
CREATE POLICY "bausteine_select" ON public.bausteine FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bausteine_insert" ON public.bausteine FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bausteine_update" ON public.bausteine FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bausteine_delete" ON public.bausteine FOR DELETE USING (auth.uid() = user_id);

-- ── Policies folders ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "folders_select" ON public.folders;
DROP POLICY IF EXISTS "folders_insert" ON public.folders;
DROP POLICY IF EXISTS "folders_update" ON public.folders;
DROP POLICY IF EXISTS "folders_delete" ON public.folders;
CREATE POLICY "folders_select" ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "folders_insert" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "folders_update" ON public.folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "folders_delete" ON public.folders FOR DELETE USING (auth.uid() = user_id);

-- ── Policies notes ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "notes_select" ON public.notes;
DROP POLICY IF EXISTS "notes_insert" ON public.notes;
DROP POLICY IF EXISTS "notes_update" ON public.notes;
DROP POLICY IF EXISTS "notes_delete" ON public.notes;
CREATE POLICY "notes_select" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes_insert" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes_delete" ON public.notes FOR DELETE USING (auth.uid() = user_id);
