-- Run with psql -v ON_ERROR_STOP=1 after recording existing grants.
BEGIN;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, PUBLIC;

-- The storage ACL entries were granted by the storage owner.
SET LOCAL ROLE supabase_storage_admin;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON storage.objects, storage.buckets FROM anon;
RESET ROLE;

CREATE POLICY temporary_dashboard_guest_mbo_read ON public.mbo_pages
  FOR SELECT TO anon USING (true);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE (n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'f'))
       OR (n.nspname = 'storage' AND c.relname IN ('objects', 'buckets'))
    GROUP BY c.oid
    HAVING has_table_privilege('anon', c.oid, 'INSERT, UPDATE, DELETE, TRUNCATE')
  ) THEN
    RAISE EXCEPTION 'An inherited privilege still allows anonymous writes';
  END IF;
END $$;
COMMIT;
