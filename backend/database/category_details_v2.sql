-- ============================================================
-- CATEGORY DETAILS v2
-- Adds the fields the Category Manager "Details" tab needs beyond the
-- original name/code/description/is_active: manual display ordering,
-- alternate/search names, and internal admin-only notes.
-- ============================================================
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS alternate_names TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS internal_notes TEXT;
