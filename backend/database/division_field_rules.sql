-- ============================================================
-- DIVISION FIELD RULES
-- Fields configured at the division level (e.g. Hardgoods) apply to every
-- category in that division, the same way a category's own fields apply to
-- its descendants — a division is effectively the top of the inheritance
-- chain, above the root categories. Divisions have no parent, so there is
-- no ADD/OVERRIDE/SUPPRESS nuance here: every row is simply "on" for the
-- division (action kept only for shape-compatibility with category_field_rules).
-- ============================================================
CREATE TABLE IF NOT EXISTS division_field_rules (
    id                    SERIAL PRIMARY KEY,
    division_id           INTEGER      NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    field_definition_id   INTEGER      NOT NULL REFERENCES category_field_definitions(id) ON DELETE CASCADE,
    action                VARCHAR(10)  NOT NULL DEFAULT 'ADD' CHECK (action IN ('ADD')),
    scope                 VARCHAR(15)  NOT NULL CHECK (scope IN ('CATALOG', 'INVENTORY', 'TRANSACTION')),
    required_at           VARCHAR(10)  NOT NULL DEFAULT 'OPTIONAL' CHECK (required_at IN ('INTAKE', 'PROCESSING', 'OPTIONAL', 'NOT_USED')),
    default_value         TEXT,
    label_override        VARCHAR(100),
    help_text             TEXT,
    short_description     BOOLEAN      NOT NULL DEFAULT false,
    long_description      BOOLEAN      NOT NULL DEFAULT false,
    search                BOOLEAN      NOT NULL DEFAULT false,
    web_filter            BOOLEAN      NOT NULL DEFAULT false,
    display_order         INTEGER      NOT NULL DEFAULT 0,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP,
    CONSTRAINT uq_division_field_scope UNIQUE (division_id, field_definition_id, scope)
);

CREATE INDEX IF NOT EXISTS idx_dfr_division ON division_field_rules(division_id);
CREATE INDEX IF NOT EXISTS idx_dfr_field    ON division_field_rules(field_definition_id);
