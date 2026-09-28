-- ============================================================
-- CATALOG ITEMS (Phase 1)
-- Follows "Catalog Item System — Data Relationships & Search-Performance
-- Recommendations". A Catalog Item is a reusable, company-wide product
-- definition — NOT physical inventory. Inventory rows (hardgoods, jewelry)
-- link back via their existing catalog_item_id column and keep their own
-- snapshotted values, so editing a Catalog Item never rewrites them.
-- Depends on: category_tree.sql, inventory_modes.sql, hardgoods.sql,
-- inventory.sql (jewelry), employees.sql.
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
-- catalog_code is the human-readable display code (e.g. VGCON-000125),
-- stamped once at creation and never changed.
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

CREATE INDEX IF NOT EXISTS idx_hardgoods_catalog_item ON hardgoods(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_jewelry_catalog_item   ON jewelry(catalog_item_id);
