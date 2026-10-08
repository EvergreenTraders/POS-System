-- ============================================================
-- CATEGORY FIELD RULES v2
-- Adds the pieces the Category Manager "Fields" tab needs that
-- category_tree.sql didn't have: a single 4-state Required At
-- (replacing the two required_for_* booleans going forward — they
-- stay in place, unused, for backward compatibility) and free-type
-- dropdown support + a wider input-type library on the Field Library.
-- ============================================================

-- required_at: added nullable first so the backfill can target exactly
-- the newly-added column, then locked down — safe to re-run.
ALTER TABLE category_field_rules ADD COLUMN IF NOT EXISTS required_at VARCHAR(10);

UPDATE category_field_rules
SET required_at = CASE
  WHEN required_for_inventory OR required_for_catalog THEN 'INTAKE'
  ELSE 'OPTIONAL'
END
WHERE required_at IS NULL;

ALTER TABLE category_field_rules ALTER COLUMN required_at SET DEFAULT 'OPTIONAL';
ALTER TABLE category_field_rules ALTER COLUMN required_at SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE category_field_rules DROP CONSTRAINT IF EXISTS category_field_rules_required_at_check;
  ALTER TABLE category_field_rules
    ADD CONSTRAINT category_field_rules_required_at_check
    CHECK (required_at IN ('INTAKE', 'PROCESSING', 'OPTIONAL', 'NOT_USED'));
END $$;

-- Field Library: free-type toggle for dropdown/multiselect fields, and a
-- wider set of input types (doc: Text, Number, Currency, Yes/No, Dropdown,
-- Multi-select, Date, Measurement).
ALTER TABLE category_field_definitions ADD COLUMN IF NOT EXISTS allow_free_type BOOLEAN NOT NULL DEFAULT false;

-- Field Library: a field in use can't be deleted, only made inactive. Inactive
-- fields keep working where already used but can't be newly added.
ALTER TABLE category_field_definitions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE category_field_definitions DROP CONSTRAINT IF EXISTS category_field_definitions_data_type_check;
  ALTER TABLE category_field_definitions
    ADD CONSTRAINT category_field_definitions_data_type_check
    CHECK (data_type IN ('TEXT', 'NUMBER', 'CURRENCY', 'ENUM', 'MULTISELECT', 'BOOLEAN', 'DATE', 'MEASUREMENT'));
END $$;

-- Copy Configuration provenance: the category a rule was copied from (shown
-- as "Copied from …" in the Fields tab). NULL = added on this category.
-- Kept when the rule is later edited; cleared if that category is deleted.
ALTER TABLE category_field_rules
  ADD COLUMN IF NOT EXISTS copied_from_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
