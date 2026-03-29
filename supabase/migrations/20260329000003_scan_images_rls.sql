-- Assurer que le bucket scan-images a RLS activé
-- (le bucket existe déjà, on ne le recrée pas)

-- Lecture : uniquement par le médecin propriétaire de la session
DROP POLICY IF EXISTS "scan_images_select" ON storage.objects;
CREATE POLICY "scan_images_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'scan-images'
  AND EXISTS (
    SELECT 1 FROM public.scan_sessions ss
    WHERE ss.token::text = split_part(name, '_', 2)
    AND ss.user_id = auth.uid()
  )
);

-- Upload : uniquement si la session QR est valide, non-expirée et en attente
DROP POLICY IF EXISTS "scan_images_insert" ON storage.objects;
CREATE POLICY "scan_images_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'scan-images'
  AND EXISTS (
    SELECT 1 FROM public.scan_sessions ss
    WHERE ss.token::text = split_part(name, '_', 2)
    AND ss.status = 'waiting'
    AND ss.expires_at > now()
  )
);

-- Suppression : uniquement par le médecin propriétaire
DROP POLICY IF EXISTS "scan_images_delete" ON storage.objects;
CREATE POLICY "scan_images_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'scan-images'
  AND EXISTS (
    SELECT 1 FROM public.scan_sessions ss
    WHERE ss.token::text = split_part(name, '_', 2)
    AND ss.user_id = auth.uid()
  )
);
