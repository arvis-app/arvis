-- ── Bucket user-files : créer si absent ─────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('user-files', 'user-files', false, 52428800)  -- 50 MB max, privé
ON CONFLICT (id) DO NOTHING;

-- ── RLS policies pour user-files ────────────────────────────────────────────
-- Les fichiers sont stockés sous userId/timestamp_filename

-- SELECT : lire ses propres fichiers (nécessaire pour createSignedUrl + download)
DROP POLICY IF EXISTS "user_files_select" ON storage.objects;
CREATE POLICY "user_files_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'user-files'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- INSERT : uploader dans son propre dossier
DROP POLICY IF EXISTS "user_files_insert" ON storage.objects;
CREATE POLICY "user_files_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-files'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- UPDATE : modifier ses propres fichiers
DROP POLICY IF EXISTS "user_files_update" ON storage.objects;
CREATE POLICY "user_files_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-files'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- DELETE : supprimer ses propres fichiers
DROP POLICY IF EXISTS "user_files_delete" ON storage.objects;
CREATE POLICY "user_files_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-files'
  AND auth.uid()::text = split_part(name, '/', 1)
);
