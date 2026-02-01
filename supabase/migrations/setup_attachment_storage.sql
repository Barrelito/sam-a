-- =============================================
-- Setup Supabase Storage for Task Attachments
-- =============================================

-- 1. Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own attachments" ON storage.objects;

-- 3. Storage policies for attachments bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to view attachments
CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attachments');

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own attachments
CREATE POLICY "Users can update their own attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
