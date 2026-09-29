-- ============================================================
-- CATALOG ITEMS (Phase 1)
-- Follows "Catalog Item System — Data Relationships & Search-Performance
-- Recommendations". A Catalog Item is a reusable, company-wide product
-- definition — NOT physical inventory. Inventory rows (hardgoods, jewelry)
-- link back via their existing catalog_item_id column and keep their own
-- snapshotted values, so editing a Catalog Item never rewrites them.
-- Also owns code generation for categories (3-char code + 5-digit
-- numeric_code, section 8) and Catalog Items (CAT-XXXXX + CAT-HG-BRANDMODEL,
-- section 9).
-- Depends on: category_tree.sql, inventory_modes.sql, hardgoods.sql,
-- inventory.sql (jewelry), employees.sql. Safe to re-run.
-- ============================================================


-- ============================================================
-- 1. COMPANIES — owner/scope for Catalog Items (doc §8). Evergreen is the
-- only company today; Catalog Items are company-owned, never store-owned.
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    name        VARCHAR(150) NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP
);

INSERT INTO companies (code, name)
SELECT 'EVERGREEN', 'Evergreen'
WHERE NOT EXISTS (SELECT 1 FROM companies LIMIT 1);


-- ============================================================
-- 2. CATALOG ITEMS (doc §3 Identity + Pricing + Status)
-- id is the immutable internal catalog_item_id used by every foreign key.
-- catalog_code (CAT-XXXXX) and friendly_code (CAT-HG-FENDERSTRAT) are the
-- human-readable codes; both are assigned at creation by the trigger in
-- section 9 (friendly_code is added there) and are never used as keys.
-- Pricing is nullable on purpose: NULL means "use history/market logic",
-- never zero.
-- ============================================================
CREATE TABLE IF NOT EXISTS catalog_items (
    id                     SERIAL        PRIMARY KEY,
    catalog_code           VARCHAR(20)   NOT NULL UNIQUE,
    company_id             INTEGER       NOT NULL REFERENCES companies(id),
    category_id            INTEGER       NOT NULL REFERENCES categories(id),
    status                 VARCHAR(10)   NOT NULL DEFAULT 'DRAFT'
                               CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE', 'MERGED')),
    make_brand             VARCHAR(100),
    model_name             VARCHAR(200),
    generated_title        VARCHAR(300),
    title_override         VARCHAR(300),
    default_inventory_mode VARCHAR(10)   REFERENCES inventory_modes(code),
    suggested_cost         NUMERIC(12,2) CHECK (suggested_cost   IS NULL OR suggested_cost   >= 0),
    suggested_retail       NUMERIC(12,2) CHECK (suggested_retail IS NULL OR suggested_retail >= 0),
    retails_new_for        NUMERIC(12,2) CHECK (retails_new_for  IS NULL OR retails_new_for  >= 0),
    internal_notes         TEXT          CHECK (internal_notes IS NULL OR char_length(internal_notes) <= 1000),
    created_by             INTEGER       REFERENCES employees(employee_id) ON DELETE SET NULL,
    updated_by             INTEGER       REFERENCES employees(employee_id) ON DELETE SET NULL,
    created_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- doc §10: scope + status (Intake search); category + status + scope (browse).
CREATE INDEX IF NOT EXISTS idx_catalog_items_company_status  ON catalog_items(company_id, status);
CREATE INDEX IF NOT EXISTS idx_catalog_items_category_status ON catalog_items(category_id, status, company_id);


-- ============================================================
-- 3. CATALOG ITEM IDENTIFIERS (doc §5) — unlimited UPC / EAN /
-- manufacturer model numbers per item; never fixed UPC1/UPC2 columns.
-- company_id lets exact lookup use the doc §10 index without joining
-- catalog_items.
-- ============================================================
CREATE TABLE IF NOT EXISTS catalog_item_identifiers (
    id               SERIAL       PRIMARY KEY,
    catalog_item_id  INTEGER      NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
    company_id       INTEGER      NOT NULL REFERENCES companies(id),
    identifier_type  VARCHAR(20)  NOT NULL
                         CHECK (identifier_type IN ('UPC', 'EAN', 'MANUFACTURER_MODEL', 'OTHER')),
    raw_value        VARCHAR(100) NOT NULL,
    normalized_value VARCHAR(100) NOT NULL,
    is_active        BOOLEAN      NOT NULL DEFAULT true,
    source           VARCHAR(30)  NOT NULL DEFAULT 'MANUAL'
                         CHECK (source IN ('MANUAL', 'MANUFACTURER_API', 'EXTERNAL_PROVIDER')),
    provider         VARCHAR(100),
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_catalog_identifier_per_item UNIQUE (catalog_item_id, identifier_type, normalized_value)
);

-- identifiers.company_id is denormalized for the lookup index, so the database
-- (not just the API) guarantees it always equals the owning item's company:
-- composite FK (catalog_item_id, company_id) → catalog_items(id, company_id).
-- ON UPDATE CASCADE carries identifiers along if an item ever changes company.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_catalog_items_id_company') THEN
    ALTER TABLE catalog_items ADD CONSTRAINT uq_catalog_items_id_company UNIQUE (id, company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_catalog_identifiers_item_company') THEN
    ALTER TABLE catalog_item_identifiers
      ADD CONSTRAINT fk_catalog_identifiers_item_company
      FOREIGN KEY (catalog_item_id, company_id) REFERENCES catalog_items(id, company_id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_catalog_identifiers_lookup
    ON catalog_item_identifiers(normalized_value, identifier_type, company_id);
CREATE INDEX IF NOT EXISTS idx_catalog_identifiers_item
    ON catalog_item_identifiers(catalog_item_id);


-- ============================================================
-- 4. CATALOG ITEM ALIASES (doc §3) — alternate titles, old merged titles
-- and search terms, kept separate from the current title. normalized_alias
-- is the searchable form (doc §10).
-- ============================================================
CREATE TABLE IF NOT EXISTS catalog_item_aliases (
    id               SERIAL       PRIMARY KEY,
    catalog_item_id  INTEGER      NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
    alias            VARCHAR(300) NOT NULL,
    normalized_alias VARCHAR(300) NOT NULL,
    -- SEARCH_TERM = staff-entered; PREVIOUS_TITLE / MERGED_TITLE are system-managed
    alias_type       VARCHAR(20)  NOT NULL DEFAULT 'SEARCH_TERM'
                         CHECK (alias_type IN ('SEARCH_TERM', 'PREVIOUS_TITLE', 'MERGED_TITLE')),
    is_active        BOOLEAN      NOT NULL DEFAULT true,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_catalog_alias_per_item UNIQUE (catalog_item_id, normalized_alias)
);

CREATE INDEX IF NOT EXISTS idx_catalog_aliases_item ON catalog_item_aliases(catalog_item_id);


-- ============================================================
-- SEARCH INDEXES (doc §9/§10) — no leading-wildcard LIKE scans.
-- * Model-number prefix match: text_pattern_ops B-tree on normalized_value.
-- * Keyword search: expression GIN full-text indexes over the title/make/model
--   and aliases. 'simple' config (no stemming) so model names like "PS5" and
--   "CFI-1215A" tokenize predictably. The search API must use these exact
--   expressions for the planner to pick the indexes up.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_catalog_identifiers_prefix
    ON catalog_item_identifiers(normalized_value text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_catalog_items_title_fts
    ON catalog_items USING GIN (
      to_tsvector('simple',
        coalesce(title_override, '') || ' ' || coalesce(generated_title, '') || ' ' ||
        coalesce(make_brand, '') || ' ' || coalesce(model_name, ''))
    );

CREATE INDEX IF NOT EXISTS idx_catalog_aliases_fts
    ON catalog_item_aliases USING GIN (to_tsvector('simple', alias));


-- ============================================================
-- 5. CATALOG FIELD VALUES (doc §2/§3) — current Catalog-scope value per
-- Field Definition from the existing Field Library. Only fields effective
-- for the item's Category with scope = CATALOG are accepted (API-enforced).
-- ============================================================
CREATE TABLE IF NOT EXISTS catalog_item_field_values (
    id                  SERIAL    PRIMARY KEY,
    catalog_item_id     INTEGER   NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
    field_definition_id INTEGER   NOT NULL REFERENCES category_field_definitions(id) ON DELETE CASCADE,
    value               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_catalog_field_value UNIQUE (catalog_item_id, field_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_field_values_item ON catalog_item_field_values(catalog_item_id);


-- ============================================================
-- 6. CATALOG AUDIT (doc §2) — who changed what and when.
-- changed_fields: { "<field>": { "from": ..., "to": ... }, ... }
-- ============================================================
CREATE TABLE IF NOT EXISTS catalog_item_audit (
    id              BIGSERIAL PRIMARY KEY,
    catalog_item_id INTEGER   NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
    action          VARCHAR(30) NOT NULL
                        CHECK (action IN ('CREATE', 'UPDATE', 'STATUS_CHANGE', 'CATEGORY_CHANGE')),
    changed_fields  JSONB     NOT NULL DEFAULT '{}',
    performed_by    INTEGER   REFERENCES employees(employee_id) ON DELETE SET NULL,
    performed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_catalog_audit_item ON catalog_item_audit(catalog_item_id, performed_at DESC);


-- ============================================================
-- 7. INVENTORY → CATALOG ITEM FOREIGN KEYS
-- hardgoods.catalog_item_id and jewelry.catalog_item_id already exist as
-- plain INTEGERs waiting for this table. NOT VALID so a legacy value can't
-- block the migration; new/updated rows are enforced. RESTRICT: a
-- referenced Catalog Item can never be deleted (doc §6).
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_hardgoods_catalog_item') THEN
    ALTER TABLE hardgoods
      ADD CONSTRAINT fk_hardgoods_catalog_item
      FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jewelry')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jewelry_catalog_item') THEN
    ALTER TABLE jewelry
      ADD CONSTRAINT fk_jewelry_catalog_item
      FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE RESTRICT NOT VALID;
  END IF;
END $$;

-- Validate the NOT VALID FKs as soon as a table has no orphaned links
-- (catalog_item_id pointing at a non-existent catalog item). Runs on every
-- migration, so a database with legacy orphans validates automatically on the
-- first run after they're cleaned up. Orphans raise a WARNING (with a count)
-- instead of failing the migration. Find them with:
--   SELECT item_id, catalog_item_id FROM hardgoods h
--   WHERE catalog_item_id IS NOT NULL
--     AND NOT EXISTS (SELECT 1 FROM catalog_items c WHERE c.id = h.catalog_item_id);
-- (same query against jewelry).
DO $$
DECLARE
  orphan_count BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_hardgoods_catalog_item' AND NOT convalidated) THEN
    SELECT COUNT(*) INTO orphan_count FROM hardgoods h
    WHERE h.catalog_item_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM catalog_items c WHERE c.id = h.catalog_item_id);
    IF orphan_count = 0 THEN
      ALTER TABLE hardgoods VALIDATE CONSTRAINT fk_hardgoods_catalog_item;
    ELSE
      RAISE WARNING 'fk_hardgoods_catalog_item left NOT VALID: % hardgoods row(s) reference a missing catalog item', orphan_count;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jewelry_catalog_item' AND NOT convalidated) THEN
    SELECT COUNT(*) INTO orphan_count FROM jewelry j
    WHERE j.catalog_item_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM catalog_items c WHERE c.id = j.catalog_item_id);
    IF orphan_count = 0 THEN
      ALTER TABLE jewelry VALIDATE CONSTRAINT fk_jewelry_catalog_item;
    ELSE
      RAISE WARNING 'fk_jewelry_catalog_item left NOT VALID: % jewelry row(s) reference a missing catalog item', orphan_count;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hardgoods_catalog_item ON hardgoods(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_jewelry_catalog_item   ON jewelry(catalog_item_id);


-- ============================================================
-- 8. CATEGORY CODES
-- Two codes per category:
--   * code         — short, user-friendly code (max 3 chars, A–Z/0–9),
--                    unique among siblings (same division + parent).
--   * numeric_code — random 5-digit number (10000–99999), assigned
--                    automatically and unique across ALL categories. This
--                    is the code that guarantees no duplicates.
-- ============================================================

-- ── 8a. numeric_code ────────────────────────────────────────
-- Picks a random unused 5-digit code. Used as the column default so every
-- insert path gets one; the unique constraint below is the real guarantee
-- (the API retries on the rare concurrent collision).
CREATE OR REPLACE FUNCTION generate_category_numeric_code() RETURNS CHAR(5) AS $$
DECLARE
  candidate CHAR(5);
BEGIN
  LOOP
    candidate := (10000 + floor(random() * 90000))::INT::TEXT;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM categories WHERE numeric_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql VOLATILE;

ALTER TABLE categories ADD COLUMN IF NOT EXISTS numeric_code CHAR(5);

-- Backfill existing categories one row at a time, so each generated code
-- sees the ones assigned before it.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM categories WHERE numeric_code IS NULL ORDER BY id LOOP
    UPDATE categories SET numeric_code = generate_category_numeric_code() WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE categories ALTER COLUMN numeric_code SET DEFAULT generate_category_numeric_code();
ALTER TABLE categories ALTER COLUMN numeric_code SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_categories_numeric_code') THEN
    ALTER TABLE categories ADD CONSTRAINT uq_categories_numeric_code UNIQUE (numeric_code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_categories_numeric_code') THEN
    ALTER TABLE categories ADD CONSTRAINT chk_categories_numeric_code CHECK (numeric_code ~ '^[1-9][0-9]{4}$');
  END IF;
END $$;


-- ── 8b. Shorten friendly codes to 3 characters ──────────────
-- Existing 4–5 char codes are truncated (ELEC → ELE, CONSO → CON, …).
-- A code whose truncated form would clash with a sibling is left alone and
-- reported, rather than failing the whole migration; rename it in Category
-- Manager and re-run.
DO $$
DECLARE
  r RECORD;
  skipped INT := 0;
BEGIN
  FOR r IN SELECT id, division_id, parent_category_id, code FROM categories
           WHERE char_length(code) > 3 ORDER BY id LOOP
    IF EXISTS (
      SELECT 1 FROM categories o
      WHERE o.id <> r.id
        AND o.division_id = r.division_id
        AND o.parent_category_id IS NOT DISTINCT FROM r.parent_category_id
        AND upper(o.code) = upper(LEFT(r.code, 3))
    ) THEN
      skipped := skipped + 1;
      RAISE WARNING 'Category % code "%" not shortened: "%" is already used by a sibling', r.id, r.code, LEFT(r.code, 3);
    ELSE
      UPDATE categories SET code = LEFT(code, 3), updated_at = CURRENT_TIMESTAMP WHERE id = r.id;
    END IF;
  END LOOP;

  -- Enforce max 3 chars for all new/edited rows; validate once every existing
  -- row complies (always true unless a clash was skipped above).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_categories_code_format') THEN
    ALTER TABLE categories ADD CONSTRAINT chk_categories_code_format
      CHECK (code ~ '^[A-Z0-9]{1,3}$') NOT VALID;
  END IF;
  IF skipped = 0 AND NOT EXISTS (SELECT 1 FROM categories WHERE code !~ '^[A-Z0-9]{1,3}$') THEN
    ALTER TABLE categories VALIDATE CONSTRAINT chk_categories_code_format;
  END IF;
END $$;


-- ── 8c. Root-level uniqueness ───────────────────────────────
-- uq_category_code_per_parent (division, parent, code) doesn't cover root
-- categories: parent_category_id is NULL there and NULLs never compare equal,
-- so two roots in one division could share a code. Close that gap.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_category_code_root') THEN
    IF EXISTS (
      SELECT 1 FROM categories WHERE parent_category_id IS NULL
      GROUP BY division_id, code HAVING COUNT(*) > 1
    ) THEN
      RAISE WARNING 'uq_category_code_root not created: duplicate root category codes exist within a division';
    ELSE
      CREATE UNIQUE INDEX uq_category_code_root ON categories (division_id, code) WHERE parent_category_id IS NULL;
    END IF;
  END IF;
END $$;


-- ============================================================
-- 9. CATALOG ITEM CODES
-- Neither code is the internal key: foreign keys always use catalog_items.id.
-- ============================================================
-- catalog_code  : CAT-XXXXX  (random 5-digit, unique) — the Catalog ID.
-- friendly_code : CAT-{division code}-{BRAND}{MODEL}, e.g. CAT-HG-FENDERSTRAT.
--   * letters/digits only, uppercase; brand isn't repeated when the model
--     already starts with it (Sony + "Sony PS5" → SONYPS5, not SONYSONYPS5)
--   * brand+model part capped at 24 chars to stay easy to type
--   * a clash gets a numeric suffix: CAT-HG-FENDERSTRAT-2, -3, …
-- Both are assigned once, at creation, by a BEFORE INSERT trigger, so every
-- insert path gets them; later Make/Model/Category edits don't re-code the
-- item (staff-facing codes stay stable). The unique constraints are the
-- real guarantee; the API retries on a rare concurrent collision.
-- NOTE: CAT-XXXXX allows at most 90,000 catalog items (10000–99999).

-- Uppercase letters/digits only: "PlayStation 5 (Disc)" → "PLAYSTATION5DISC".
CREATE OR REPLACE FUNCTION catalog_code_token(txt TEXT) RETURNS TEXT AS $$
  SELECT upper(regexp_replace(coalesce(txt, ''), '[^A-Za-z0-9]+', '', 'g'));
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION generate_catalog_numeric_code() RETURNS VARCHAR(20) AS $$
DECLARE
  candidate VARCHAR(20);
  attempts  INT := 0;
BEGIN
  LOOP
    attempts := attempts + 1;
    IF attempts > 1000 THEN
      RAISE EXCEPTION 'Unable to allocate a unique CAT-XXXXX catalog code; the 5-digit range is nearly exhausted';
    END IF;
    candidate := 'CAT-' || (10000 + floor(random() * 90000))::INT::TEXT;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION generate_catalog_friendly_code(
  p_category_id INT, p_make TEXT, p_model TEXT, p_exclude_id INT DEFAULT NULL
) RETURNS VARCHAR(40) AS $$
DECLARE
  division_code TEXT;
  brand_token   TEXT := catalog_code_token(p_make);
  model_token   TEXT := catalog_code_token(p_model);
  body          TEXT;
  base          TEXT;
  candidate     TEXT;
  n             INT := 1;
BEGIN
  SELECT d.code INTO division_code
  FROM categories c JOIN divisions d ON d.id = c.division_id
  WHERE c.id = p_category_id;

  IF brand_token <> '' AND left(model_token, length(brand_token)) = brand_token THEN
    body := model_token;
  ELSE
    body := brand_token || model_token;
  END IF;
  body := left(body, 24);
  IF body = '' THEN body := 'ITEM'; END IF;

  base := 'CAT-' || coalesce(division_code, 'XX') || '-' || body;
  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM catalog_items
    WHERE friendly_code = candidate AND id IS DISTINCT FROM p_exclude_id
  ) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql VOLATILE;

ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS friendly_code VARCHAR(40);

-- Re-code existing items once: anything not already CAT-XXXXX (e.g. the
-- earlier {category code}-000001 format) gets new codes. Row by row so each
-- generated code sees the ones assigned before it.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM catalog_items WHERE catalog_code !~ '^CAT-[1-9][0-9]{4}$' ORDER BY id LOOP
    UPDATE catalog_items SET catalog_code = generate_catalog_numeric_code() WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT id, category_id, make_brand, model_name FROM catalog_items WHERE friendly_code IS NULL ORDER BY id LOOP
    UPDATE catalog_items
    SET friendly_code = generate_catalog_friendly_code(r.category_id, r.make_brand, r.model_name, r.id)
    WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE catalog_items ALTER COLUMN friendly_code SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_catalog_items_friendly_code') THEN
    ALTER TABLE catalog_items ADD CONSTRAINT uq_catalog_items_friendly_code UNIQUE (friendly_code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_catalog_items_catalog_code') THEN
    ALTER TABLE catalog_items ADD CONSTRAINT chk_catalog_items_catalog_code
      CHECK (catalog_code ~ '^CAT-[1-9][0-9]{4}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_catalog_items_friendly_code') THEN
    ALTER TABLE catalog_items ADD CONSTRAINT chk_catalog_items_friendly_code
      CHECK (friendly_code ~ '^CAT-[A-Z0-9]+-[A-Z0-9]+(-[0-9]+)?$');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION catalog_items_assign_codes() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.catalog_code IS NULL THEN
    NEW.catalog_code := generate_catalog_numeric_code();
  END IF;
  IF NEW.friendly_code IS NULL THEN
    NEW.friendly_code := generate_catalog_friendly_code(NEW.category_id, NEW.make_brand, NEW.model_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_catalog_items_assign_codes ON catalog_items;
CREATE TRIGGER trg_catalog_items_assign_codes
  BEFORE INSERT ON catalog_items
  FOR EACH ROW EXECUTE PROCEDURE catalog_items_assign_codes();


-- ============================================================
-- 10. CATALOG ITEM IMAGES (doc §2 Catalog Image, §12)
-- Reference/stock images for a Catalog Item — not intake photos, which stay
-- on the inventory record. Files live in Evergreen-controlled storage
-- (uploads/catalog/), never hot-linked. One image may be primary; replacing
-- it keeps the previous row (non-primary) for history.
-- source: how it was added — UPLOAD / CAMERA by staff, or a provider import
-- (MANUFACTURER_API / EXTERNAL_PROVIDER, with source_url + provider).
-- ============================================================
CREATE TABLE IF NOT EXISTS catalog_item_images (
    id              SERIAL       PRIMARY KEY,
    catalog_item_id INTEGER      NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
    image_url       VARCHAR(500) NOT NULL,
    is_primary      BOOLEAN      NOT NULL DEFAULT false,
    source          VARCHAR(20)  NOT NULL DEFAULT 'UPLOAD'
                        CHECK (source IN ('UPLOAD', 'CAMERA', 'MANUFACTURER_API', 'EXTERNAL_PROVIDER')),
    source_url      TEXT,
    provider        VARCHAR(100),
    uploaded_by     INTEGER      REFERENCES employees(employee_id) ON DELETE SET NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_catalog_images_item ON catalog_item_images(catalog_item_id);
-- At most one primary image per Catalog Item.
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_images_primary
    ON catalog_item_images(catalog_item_id) WHERE is_primary;
