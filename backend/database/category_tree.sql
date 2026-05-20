-- ============================================================
-- CATEGORY TREE
-- Shared across all divisions (JW, HG, CB).
-- Store owner creates categories and fields through the UI.
-- No category seed data here -- only the 3 top-level divisions.
-- ============================================================


-- ============================================================
-- 1. DIVISIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS divisions (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(3)   NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP
);

-- Seed the 3 fixed divisions only if the table is empty
INSERT INTO divisions (code, name, description)
SELECT * FROM (VALUES
    ('JW', 'Jewellery',       'Jewellery division'),
    ('HG', 'Hardgoods',       'Hardgoods division'),
    ('CB', 'Coins & Bullion', 'Coins and bullion division')
) AS v(code, name, description)
WHERE NOT EXISTS (SELECT 1 FROM divisions LIMIT 1);


-- ============================================================
-- 2. CATEGORIES
-- Self-referencing for unlimited depth.
-- parent_category_id = NULL means top-level category.
-- Code is unique within a division (e.g. 'EL' under HG, 'EL' under JW are distinct).
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id                 SERIAL PRIMARY KEY,
    division_id        INTEGER      NOT NULL REFERENCES divisions(id),
    parent_category_id INTEGER      REFERENCES categories(id),
    code               VARCHAR(5)   NOT NULL,
    name               VARCHAR(100) NOT NULL,
    description        TEXT,
    is_active          BOOLEAN      NOT NULL DEFAULT true,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP,
    CONSTRAINT uq_category_code_per_parent UNIQUE (division_id, parent_category_id, code)
);

CREATE INDEX IF NOT EXISTS idx_categories_division ON categories(division_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent   ON categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_categories_code     ON categories(code);


-- ============================================================
-- 3. CATEGORY FIELD DEFINITIONS
-- Global reusable field library shared across all categories.
-- Use specific keys (screen_size_inches, pickup_type) not generic ones (size).
-- allowed_values is populated only for ENUM data_type.
-- ============================================================

-- Rename from old name if upgrading
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'field_definitions') THEN
    ALTER TABLE field_definitions RENAME TO category_field_definitions;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS category_field_definitions (
    id              SERIAL PRIMARY KEY,
    field_key       VARCHAR(100) NOT NULL UNIQUE,
    label           VARCHAR(100) NOT NULL,
    data_type       VARCHAR(10)  NOT NULL CHECK (data_type IN ('TEXT', 'NUMBER', 'ENUM', 'BOOLEAN', 'DATE')),
    allowed_values  JSONB        DEFAULT NULL,
    unit_of_measure VARCHAR(50),
    normalizer      VARCHAR(100),
    validation_rule TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_category_field_definitions_key ON category_field_definitions(field_key);


-- ============================================================
-- 4. CATEGORY FIELD RULES
-- Defines how a field_definition behaves within a specific category.
-- Child categories can ADD, OVERRIDE, or SUPPRESS rules from parents.
-- applies_to_modes restricts a rule to specific inventory modes
--   e.g. '{PIECE,UNIT}' means this field only shows for PIECE or UNIT items.
-- ============================================================
CREATE TABLE IF NOT EXISTS category_field_rules (
    id                    SERIAL PRIMARY KEY,
    category_id           INTEGER      NOT NULL REFERENCES categories(id),
    field_definition_id   INTEGER      NOT NULL REFERENCES category_field_definitions(id) ON DELETE CASCADE,
    action                VARCHAR(10)  NOT NULL CHECK (action IN ('ADD', 'OVERRIDE', 'SUPPRESS')),
    scope                 VARCHAR(15)  NOT NULL CHECK (scope IN ('CATALOG', 'INVENTORY', 'TRANSACTION')),
    required_for_catalog  BOOLEAN      NOT NULL DEFAULT false,
    required_for_inventory BOOLEAN     NOT NULL DEFAULT false,
    applies_to_modes      TEXT[]       NOT NULL DEFAULT '{}',
    display_order         INTEGER      NOT NULL DEFAULT 0,
    default_value         TEXT,
    label_override        VARCHAR(100),
    help_text             TEXT,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP,
    CONSTRAINT uq_category_field_scope UNIQUE (category_id, field_definition_id, scope)
);

CREATE INDEX IF NOT EXISTS idx_cfr_category ON category_field_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_cfr_field    ON category_field_rules(field_definition_id);

-- Ensure FK has ON DELETE CASCADE (re-add if upgrading from version without it)
DO $$ BEGIN
  ALTER TABLE category_field_rules
    DROP CONSTRAINT IF EXISTS category_field_rules_field_definition_id_fkey;
  ALTER TABLE category_field_rules
    ADD CONSTRAINT category_field_rules_field_definition_id_fkey
    FOREIGN KEY (field_definition_id) REFERENCES category_field_definitions(id) ON DELETE CASCADE;
END $$;
