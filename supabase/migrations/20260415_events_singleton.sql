-- Canonicalize public.events into a singleton row (shared calendar for all users)
-- Safe to run repeatedly.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS singleton_key TEXT;

ALTER TABLE public.events
  ALTER COLUMN singleton_key SET DEFAULT 'global';

UPDATE public.events
SET singleton_key = 'global'
WHERE singleton_key IS NULL;

DO $$
DECLARE
  canonical_id UUID;
  merged_data JSONB := '[]'::jsonb;
BEGIN
  WITH events_rows AS (
    SELECT
      id,
      data,
      COALESCE(updated_at, created_at, NOW()) AS ts
    FROM public.events
  ),
  events_expanded AS (
    SELECT
      r.id AS row_id,
      r.ts,
      e.ordinality AS ord,
      e.elem AS event,
      COALESCE(
        NULLIF(e.elem->>'id', ''),
        r.id::text || '-' || e.ordinality::text
      ) AS event_id
    FROM events_rows r
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(r.data) = 'array' THEN r.data
        WHEN jsonb_typeof(r.data->'events') = 'array' THEN r.data->'events'
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS e(elem, ordinality)
  ),
  dedup AS (
    SELECT DISTINCT ON (event_id)
      event_id,
      event
    FROM events_expanded
    ORDER BY event_id, ts DESC, row_id DESC, ord DESC
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_set(event, '{id}', to_jsonb(event_id), true)
      ORDER BY (event->>'date') NULLS LAST, event_id
    ),
    '[]'::jsonb
  )
  INTO merged_data
  FROM dedup;

  SELECT id
  INTO canonical_id
  FROM public.events
  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
  LIMIT 1;

  IF canonical_id IS NULL THEN
    INSERT INTO public.events (singleton_key, data, created_at, updated_at)
    VALUES ('global', merged_data, NOW(), NOW());
  ELSE
    UPDATE public.events
    SET singleton_key = 'global',
        data = merged_data,
        updated_at = NOW()
    WHERE id = canonical_id;

    DELETE FROM public.events
    WHERE id <> canonical_id;
  END IF;
END $$;

UPDATE public.events
SET singleton_key = 'global'
WHERE singleton_key <> 'global';

ALTER TABLE public.events
  ALTER COLUMN singleton_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS events_singleton_key_uidx
  ON public.events(singleton_key);
