-- ============================================================
-- CATEGORY DESCRIPTIONS
-- Powers the Category Manager "Descriptions" tab: the Item Title
-- template, per-field description/search/web-filter output flags,
-- and category-level search/web behaviour toggles.
-- Depends on category_tree.sql (categories, category_field_rules).
-- ============================================================

-- Per-field output flags — whether an assigned field feeds the Short/Long
-- Description, is indexed for staff search, or exposed as a web filter.
-- Web Filter implies Search (enforced in the API, not here).
ALTER TABLE category_field_rules
  ADD COLUMN IF NOT EXISTS short_description BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS long_description  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS search            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS web_filter        BOOLEAN NOT NULL DEFAULT false;

-- One row per category holding its Item Title template and the
-- category-level (not per-field) search/web settings. Absent row = defaults.
CREATE TABLE IF NOT EXISTS category_description_settings (
    category_id                    INTEGER PRIMARY KEY REFERENCES categories(id) ON DELETE CASCADE,
    -- Ordered list of tokens, e.g. ["category", "field:12", "field:7|field:9"]
    -- ("field:A|field:B" = use field A's value, falling back to B when A is blank).
    title_template                 JSONB   NOT NULL DEFAULT '["category"]',
    -- The synthetic "Category" row in Descriptions Field Usage isn't a real
    -- category_field_rules row, so its two flags live here instead.
    category_in_short_description  BOOLEAN NOT NULL DEFAULT true,
    category_in_long_description   BOOLEAN NOT NULL DEFAULT true,
    search_index_title             BOOLEAN NOT NULL DEFAULT true,
    search_index_short_description BOOLEAN NOT NULL DEFAULT true,
    search_index_long_description  BOOLEAN NOT NULL DEFAULT false,
    boost_title_matches            BOOLEAN NOT NULL DEFAULT true,
    web_search_title               BOOLEAN NOT NULL DEFAULT true,
    web_search_short_description   BOOLEAN NOT NULL DEFAULT true,
    web_search_long_description    BOOLEAN NOT NULL DEFAULT true,
    updated_at                     TIMESTAMP
);
