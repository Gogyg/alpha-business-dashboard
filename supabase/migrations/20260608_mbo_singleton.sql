-- Add a shared singleton page for the MBO dashboard.
-- Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS public.mbo_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  singleton_key TEXT NOT NULL DEFAULT 'global',
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.mbo_pages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mbo_pages'
      AND policyname = 'Allow read access for authenticated users to mbo_pages'
  ) THEN
    CREATE POLICY "Allow read access for authenticated users to mbo_pages"
      ON public.mbo_pages FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mbo_pages'
      AND policyname = 'Allow write access for authenticated users to mbo_pages'
  ) THEN
    CREATE POLICY "Allow write access for authenticated users to mbo_pages"
      ON public.mbo_pages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mbo_pages'
      AND policyname = 'Allow update access for authenticated users to mbo_pages'
  ) THEN
    CREATE POLICY "Allow update access for authenticated users to mbo_pages"
      ON public.mbo_pages FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
END $$;

INSERT INTO public.mbo_pages (singleton_key, data, created_at, updated_at)
SELECT
  'global',
  '{
    "headerTitle": "Command Center",
    "headerSubtitle": "Executive Dashboard • MBO",
    "liveLabel": "SYSTEM LIVE",
    "sections": []
  }'::jsonb,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.mbo_pages WHERE singleton_key = 'global'
);

CREATE UNIQUE INDEX IF NOT EXISTS mbo_pages_singleton_key_uidx
  ON public.mbo_pages(singleton_key);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'mbo_pages'
  ) THEN
    RETURN;
  END IF;

  ALTER PUBLICATION supabase_realtime ADD TABLE public.mbo_pages;
END $$;
