-- Aligner les vignettes tutoriels sur les assets SVG du bucket Storage
UPDATE public.tutorials
SET thumb_path = 'thumbs/' || slug || '.svg',
    updated_at = now()
WHERE thumb_path IS NULL OR thumb_path LIKE '%.jpg';
