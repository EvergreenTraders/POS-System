-- ============================================================
-- CATEGORY PROCESSING
-- Powers the Category Manager "Processing" tab. Nothing here is
-- hard-coded: staff build the list of processing requirements themselves
-- (like the Field Library) and each category picks which apply, plus an
-- editable processing checklist. Categories inherit from their parent
-- (06 Processing doc §3: SHOULD inherit category processing defaults).
-- These are category DEFAULTS; each inventory record still tracks what
-- actually happened to it. Depends on category_tree.sql, employees.sql.
-- ============================================================

-- Library of processing requirements (e.g. "Testing Required"), shared by
-- every category.
CREATE TABLE IF NOT EXISTS processing_requirements (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_processing_requirements_name
    ON processing_requirements (lower(name));

-- Per-category choice for a library requirement. required = true/false is
-- this category's own setting; no row = inherit from the nearest ancestor
-- that has one (default: not required).
CREATE TABLE IF NOT EXISTS category_processing_requirements (
    category_id    INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    requirement_id INTEGER NOT NULL REFERENCES processing_requirements(id) ON DELETE CASCADE,
    required       BOOLEAN NOT NULL,
    PRIMARY KEY (category_id, requirement_id)
);

-- Per-category processing checklist. checklist NULL = inherit the nearest
-- ancestor's; an empty array is a deliberate "no checklist".
-- Items: [{ "requirement": text, "required": bool, "must_pass": bool }, …]
-- in display order.
CREATE TABLE IF NOT EXISTS category_processing_settings (
    category_id INTEGER   PRIMARY KEY REFERENCES categories(id) ON DELETE CASCADE,
    checklist   JSONB,
    updated_by  INTEGER   REFERENCES employees(employee_id) ON DELETE SET NULL,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
