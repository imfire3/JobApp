-- Allow CV image uploads (OCR path) in addition to PDF
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp'
]::text[]
where id = 'cv-files';
