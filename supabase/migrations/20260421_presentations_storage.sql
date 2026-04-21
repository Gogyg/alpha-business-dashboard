-- Presentations packages metadata table
CREATE TABLE IF NOT EXISTS public.presentations_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_date DATE NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB NOT NULL DEFAULT '{"pages": [], "assets": []}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS presentations_packages_updated_at_idx
  ON public.presentations_packages(updated_at DESC);

ALTER TABLE public.presentations_packages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'presentations_packages' AND policyname = 'Allow read access for authenticated users to presentations_packages'
  ) THEN
    CREATE POLICY "Allow read access for authenticated users to presentations_packages"
      ON public.presentations_packages
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'presentations_packages' AND policyname = 'Allow insert access for authenticated users to presentations_packages'
  ) THEN
    CREATE POLICY "Allow insert access for authenticated users to presentations_packages"
      ON public.presentations_packages
      FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'presentations_packages' AND policyname = 'Allow update access for authenticated users to presentations_packages'
  ) THEN
    CREATE POLICY "Allow update access for authenticated users to presentations_packages"
      ON public.presentations_packages
      FOR UPDATE
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'presentations_packages' AND policyname = 'Allow delete access for authenticated users to presentations_packages'
  ) THEN
    CREATE POLICY "Allow delete access for authenticated users to presentations_packages"
      ON public.presentations_packages
      FOR DELETE
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Realtime subscription support
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.presentations_packages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Storage bucket for presentation files
INSERT INTO storage.buckets (id, name, public)
VALUES ('presentations', 'presentations', FALSE)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow read presentations bucket for authenticated users'
  ) THEN
    CREATE POLICY "Allow read presentations bucket for authenticated users"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'presentations' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow insert presentations bucket for authenticated users'
  ) THEN
    CREATE POLICY "Allow insert presentations bucket for authenticated users"
      ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = 'presentations' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow update presentations bucket for authenticated users'
  ) THEN
    CREATE POLICY "Allow update presentations bucket for authenticated users"
      ON storage.objects
      FOR UPDATE
      USING (bucket_id = 'presentations' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow delete presentations bucket for authenticated users'
  ) THEN
    CREATE POLICY "Allow delete presentations bucket for authenticated users"
      ON storage.objects
      FOR DELETE
      USING (bucket_id = 'presentations' AND auth.role() = 'authenticated');
  END IF;
END $$;
