-- Limit each presentation file to 40 MiB; keep existing asset MIME permissions.
UPDATE storage.buckets
SET file_size_limit = 41943040,
    allowed_mime_types = CASE
      WHEN allowed_mime_types IS NULL THEN NULL
      WHEN 'application/pdf' = ANY(allowed_mime_types) THEN allowed_mime_types
      ELSE array_append(allowed_mime_types, 'application/pdf')
    END
WHERE id = 'presentations';
