-- ============================================================
-- HARDGOODS INVENTORY
-- part_number is separate (ST-, BULK-, VP-, BT- prefixes per mode)
-- vendor_id and catalog_item_id FKs are commented out until those
-- tables are created in later steps.
-- ============================================================


-- ============================================================
-- 1. HARDGOODS
-- ============================================================
CREATE TABLE IF NOT EXISTS hardgoods (
    item_id     VARCHAR(30) PRIMARY KEY,

    -- Inventory mode
    mode        VARCHAR(10) NOT NULL DEFAULT 'PIECE'
                    CHECK (mode IN ('PIECE', 'UNIT', 'STOCK', 'BUCKET')),

    -- Category (FK to categories table created in category_tree.sql)
    category_id INTEGER REFERENCES categories(id),

    -- FK stubs -- uncomment once referenced tables exist
    -- catalog_item_id INTEGER REFERENCES catalog_items(id),
    -- stock_sku_id    INTEGER REFERENCES stock_skus(id),
    -- vendor_id       INTEGER REFERENCES vendors(id),
    catalog_item_id INTEGER DEFAULT NULL,
    stock_sku_id    INTEGER DEFAULT NULL,
    vendor_id       INTEGER DEFAULT NULL,

    -- Descriptions
    long_desc                   TEXT,
    short_desc                  TEXT,
    original_intake_description TEXT,   -- immutable after intake

    -- Condition & location
    condition   VARCHAR(50),
    location    VARCHAR(50),

    -- Status (mirrors jewelry: HOLD | ACTIVE | IN_PROCESS | SOLD | etc.)
    status      VARCHAR(20) NOT NULL DEFAULT 'HOLD',

    -- Pricing
    cost_price   NUMERIC(10,2) CHECK (cost_price IS NULL OR cost_price >= 0),
    retail_price NUMERIC(10,2) CHECK (retail_price IS NULL OR retail_price >= 0),

    -- Mode-specific fields
    serial_number VARCHAR(100),         -- UNIT mode: physical serial
    quantity      INTEGER,              -- STOCK mode: units on hand
    bucket_value  NUMERIC(10,2),        -- BUCKET mode: total bucket value

    -- Processing workflow (same pattern as jewelry)
    processing_status   VARCHAR(30) NOT NULL DEFAULT 'INTAKE_PENDING',
    processing_queue    VARCHAR(30)          DEFAULT NULL,
    current_location_id INTEGER              DEFAULT NULL,
    sellable_status     VARCHAR(20) NOT NULL DEFAULT 'NOT_SELLABLE',
    blocking_reason     TEXT                 DEFAULT NULL,
    next_action         TEXT                 DEFAULT NULL,

    -- Source of item
    source VARCHAR(30) CHECK (source IS NULL OR source IN (
        'CUSTOMER_PURCHASE',
        'CUSTOMER_TRADE',
        'CONSIGNMENT',
        'PAWN_DEFAULT',
        'VENDOR_PURCHASE',
        'VENDOR_MEMO',
        'STORE_TRANSFER',
        'BULK_IMPORT'
    )),

    -- Vendor memo fields
    is_memo       BOOLEAN NOT NULL DEFAULT false,
    memo_due_date DATE             DEFAULT NULL,

    -- Part number (ST-, BULK-, VP-, BT- prefix depending on mode/source)
    part_number VARCHAR(50) DEFAULT NULL,

    -- Media and notes
    images JSONB NOT NULL DEFAULT '[]',
    notes  TEXT,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Unique part number (sparse -- NULLs are excluded from unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_hardgoods_part_number
    ON hardgoods (part_number) WHERE part_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hardgoods_status           ON hardgoods(status);
CREATE INDEX IF NOT EXISTS idx_hardgoods_category         ON hardgoods(category_id);
CREATE INDEX IF NOT EXISTS idx_hardgoods_mode             ON hardgoods(mode);
CREATE INDEX IF NOT EXISTS idx_hardgoods_processing_status ON hardgoods(processing_status);
CREATE INDEX IF NOT EXISTS idx_hardgoods_sellable_status  ON hardgoods(sellable_status);
CREATE INDEX IF NOT EXISTS idx_hardgoods_vendor           ON hardgoods(vendor_id);
CREATE INDEX IF NOT EXISTS idx_hardgoods_images           ON hardgoods USING GIN (images);


-- ============================================================
-- 2. HARDGOODS ATTRIBUTES
-- Key/value store for category-driven dynamic fields.
-- Populated from category_field_rules (INVENTORY scope).
-- ============================================================
CREATE TABLE IF NOT EXISTS hardgoods_attributes (
    id         SERIAL      PRIMARY KEY,
    item_id    VARCHAR(30) NOT NULL REFERENCES hardgoods(item_id) ON DELETE CASCADE,
    field_key  VARCHAR(100) NOT NULL,
    field_value TEXT,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uq_hardgoods_attribute UNIQUE (item_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_hardgoods_attr_item  ON hardgoods_attributes(item_id);
CREATE INDEX IF NOT EXISTS idx_hardgoods_attr_key   ON hardgoods_attributes(field_key);
