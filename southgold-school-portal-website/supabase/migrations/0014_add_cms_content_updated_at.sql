-- Migration 0014_add_cms_content_updated_at.sql
-- Track when the landing page CMS content actually changed, so the
-- sitemap can report an accurate <lastmod> instead of the current
-- timestamp on every request (which search engines treat as a
-- meaningless/untrustworthy signal).

ALTER TABLE cms_content ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Reuses the set_updated_at() trigger function created for `users` in
-- 0001_init.sql.
DROP TRIGGER IF EXISTS trg_cms_content_updated ON cms_content;
CREATE TRIGGER trg_cms_content_updated
  BEFORE UPDATE ON cms_content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
