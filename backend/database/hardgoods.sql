-- Hardgoods Inventory Schema
-- Supports 4 tracking types: ITEM, SKU, HYBRID, BUCKET

-- ============================================
-- 1. CATEGORY REFERENCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS hardgoods_category (
    id SERIAL PRIMARY KEY,
    category_code VARCHAR(10) NOT NULL UNIQUE,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    id_prefix VARCHAR(4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Insert default categories
INSERT INTO hardgoods_category (category_code, category_name, description, id_prefix) VALUES
    ('ELEC', 'Electronics', 'Phones, laptops, tablets, gaming consoles', 'ELEC'),
    ('TOOL', 'Tools/Equipment', 'Power tools, hand tools, machinery', 'TOOL'),
    ('GENM', 'General Merchandise', 'Furniture, collectibles, musical instruments, misc', 'GENM')
ON CONFLICT (category_code) DO NOTHING;

-- ============================================
-- 2. SUBCATEGORY REFERENCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS hardgoods_subcategory (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES hardgoods_category(id) ON DELETE CASCADE,
    subcategory_code VARCHAR(20) NOT NULL,
    subcategory_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, subcategory_code)
);

-- Insert default subcategories
INSERT INTO hardgoods_subcategory (category_id, subcategory_code, subcategory_name)
SELECT c.id, s.code, s.name
FROM hardgoods_category c
CROSS JOIN (VALUES
    -- Electronics
    ('ELEC', 'PHONE', 'Cell Phones'),
    ('ELEC', 'LAPTOP', 'Laptops'),
    ('ELEC', 'TABLET', 'Tablets'),
    ('ELEC', 'GAMING', 'Gaming Consoles'),
    ('ELEC', 'AUDIO', 'Audio Equipment'),
    ('ELEC', 'TV', 'Televisions'),
    ('ELEC', 'CAMERA', 'Cameras'),
    ('ELEC', 'WEARABLE', 'Wearables/Smartwatches'),
    -- Tools
    ('TOOL', 'POWER', 'Power Tools'),
    ('TOOL', 'HAND', 'Hand Tools'),
    ('TOOL', 'MACHINE', 'Machinery'),
    ('TOOL', 'GARDEN', 'Garden Equipment'),
    ('TOOL', 'AUTO', 'Automotive Tools'),
    -- General Merchandise
    ('GENM', 'FURN', 'Furniture'),
    ('GENM', 'COLLECT', 'Collectibles'),
    ('GENM', 'MUSIC', 'Musical Instruments'),
    ('GENM', 'SPORT', 'Sporting Goods'),
    ('GENM', 'APPLIANCE', 'Appliances'),
    ('GENM', 'MISC', 'Miscellaneous')
) AS s(cat_code, code, name)
WHERE c.category_code = s.cat_code
ON CONFLICT (category_id, subcategory_code) DO NOTHING;

-- ============================================
-- 3. SKU DEFINITION TABLE (for SKU and HYBRID types)
-- ============================================
CREATE TABLE IF NOT EXISTS hardgoods_sku (
    sku_id VARCHAR(30) PRIMARY KEY,
    sku_name VARCHAR(200) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES hardgoods_category(id),
    subcategory_id INTEGER REFERENCES hardgoods_subcategory(id),
    brand VARCHAR(100),
    model VARCHAR(100),
    description TEXT,
    default_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    reorder_level INTEGER DEFAULT 0,
    images JSONB DEFAULT '[]',
    attributes JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hardgoods_sku_category ON hardgoods_sku(category_id);
CREATE INDEX IF NOT EXISTS idx_hardgoods_sku_brand ON hardgoods_sku(brand);
CREATE INDEX IF NOT EXISTS idx_hardgoods_sku_active ON hardgoods_sku(is_active);

-- ============================================
-- 4. BUCKET/BIN DEFINITION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS hardgoods_bucket (
    bucket_id SERIAL PRIMARY KEY,
    bucket_name VARCHAR(100) NOT NULL UNIQUE,
    location_id INTEGER REFERENCES storage_location(location_id),
    description TEXT,
    category_id INTEGER REFERENCES hardgoods_category(id),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by INTEGER REFERENCES employees(employee_id),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_hardgoods_bucket_location ON hardgoods_bucket(location_id);
CREATE INDEX IF NOT EXISTS idx_hardgoods_bucket_status ON hardgoods_bucket(status);

-- ============================================
-- 5. MAIN HARDGOODS INVENTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS hardgoods (
    -- Primary identification
    item_id VARCHAR(15) PRIMARY KEY,

    -- Tracking type discriminator
    tracking_type VARCHAR(10) NOT NULL DEFAULT 'ITEM',

    -- SKU reference (for SKU and HYBRID types)
    sku_id VARCHAR(30) REFERENCES hardgoods_sku(sku_id),

    -- Bucket reference (for BUCKET type)
    bucket_id INTEGER REFERENCES hardgoods_bucket(bucket_id),

    -- Quantity tracking
    quantity INTEGER DEFAULT 1,
    quantity_available INTEGER DEFAULT 1,

    -- Basic item information
    short_desc VARCHAR(200),
    long_desc TEXT,
    category_id INTEGER NOT NULL REFERENCES hardgoods_category(id),
    subcategory_id INTEGER REFERENCES hardgoods_subcategory(id),
    brand VARCHAR(100),
    model VARCHAR(100),

    -- Identification details (for ITEM and HYBRID individual pieces)
    serial_number VARCHAR(100),
    imei VARCHAR(20),
    mac_address VARCHAR(20),

    -- Condition and quality
    condition VARCHAR(20) DEFAULT 'GOOD',
    condition_notes TEXT,

    -- Pricing
    cost_price DECIMAL(10,2),
    retail_price DECIMAL(10,2),
    minimum_price DECIMAL(10,2),

    -- Status and workflow (matches jewelry pattern)
    status VARCHAR(20) NOT NULL DEFAULT 'HOLD',

    -- Location tracking
    location VARCHAR(100),
    bin_location VARCHAR(50),

    -- Media
    images JSONB DEFAULT '[]',

    -- Metadata
    notes TEXT,
    source VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,

    -- Audit fields
    created_by INTEGER REFERENCES employees(employee_id),
    last_updated_by INTEGER REFERENCES employees(employee_id),

    -- Constraints
    CONSTRAINT valid_tracking_type CHECK (tracking_type IN ('ITEM', 'SKU', 'HYBRID', 'BUCKET')),
    CONSTRAINT valid_condition CHECK (condition IN ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR')),
    CONSTRAINT valid_quantity CHECK (quantity >= 0),
    CONSTRAINT valid_quantity_available CHECK (quantity_available >= 0 AND quantity_available <= quantity),
    CONSTRAINT sku_required_for_sku_type CHECK (
        (tracking_type IN ('SKU', 'HYBRID') AND sku_id IS NOT NULL) OR
        (tracking_type NOT IN ('SKU', 'HYBRID'))
    ),
    CONSTRAINT bucket_required_for_bucket_type CHECK (
        (tracking_type = 'BUCKET' AND bucket_id IS NOT NULL) OR
        (tracking_type != 'BUCKET')
    )
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_hardgoods_status ON hardgoods(status);
CREATE INDEX IF NOT EXISTS idx_hardgoods_category ON hardgoods(category_id);
CREATE INDEX IF NOT EXISTS idx_hardgoods_tracking_type ON hardgoods(tracking_type);
CREATE INDEX IF NOT EXISTS idx_hardgoods_sku_id ON hardgoods(sku_id);
CREATE INDEX IF NOT EXISTS idx_hardgoods_bucket_id ON hardgoods(bucket_id);
CREATE INDEX IF NOT EXISTS idx_hardgoods_serial ON hardgoods(serial_number);
CREATE INDEX IF NOT EXISTS idx_hardgoods_brand ON hardgoods(brand);
CREATE INDEX IF NOT EXISTS idx_hardgoods_images ON hardgoods USING GIN (images);
CREATE INDEX IF NOT EXISTS idx_hardgoods_created_at ON hardgoods(created_at);

-- ============================================
-- 6. HARDGOODS ITEM HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS hardgoods_item_history (
    history_id BIGSERIAL PRIMARY KEY,
    item_id VARCHAR(15) NOT NULL,
    version_number INTEGER NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by INTEGER REFERENCES employees(employee_id),
    action_type VARCHAR(50) NOT NULL,
    changed_fields JSONB NOT NULL,
    change_notes TEXT,
    source VARCHAR(255),
    bought_from VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_hardgoods_history_item_id ON hardgoods_item_history(item_id);
CREATE INDEX IF NOT EXISTS idx_hardgoods_history_changed_at ON hardgoods_item_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_hardgoods_history_action_type ON hardgoods_item_history(action_type);

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Trigger for updated_at on hardgoods
CREATE OR REPLACE FUNCTION update_hardgoods_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_hardgoods_timestamp ON hardgoods;
CREATE TRIGGER update_hardgoods_timestamp
    BEFORE UPDATE ON hardgoods
    FOR EACH ROW
    EXECUTE FUNCTION update_hardgoods_timestamp();

-- Trigger for updated_at on hardgoods_sku
DROP TRIGGER IF EXISTS update_hardgoods_sku_timestamp ON hardgoods_sku;
CREATE TRIGGER update_hardgoods_sku_timestamp
    BEFORE UPDATE ON hardgoods_sku
    FOR EACH ROW
    EXECUTE FUNCTION update_hardgoods_timestamp();

-- Trigger for updated_at on hardgoods_bucket
DROP TRIGGER IF EXISTS update_hardgoods_bucket_timestamp ON hardgoods_bucket;
CREATE TRIGGER update_hardgoods_bucket_timestamp
    BEFORE UPDATE ON hardgoods_bucket
    FOR EACH ROW
    EXECUTE FUNCTION update_hardgoods_timestamp();

-- Trigger for updated_at on hardgoods_category
DROP TRIGGER IF EXISTS update_hardgoods_category_timestamp ON hardgoods_category;
CREATE TRIGGER update_hardgoods_category_timestamp
    BEFORE UPDATE ON hardgoods_category
    FOR EACH ROW
    EXECUTE FUNCTION update_hardgoods_timestamp();

-- ============================================
-- 8. HISTORY TRACKING TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION track_hardgoods_changes() RETURNS TRIGGER AS $$
DECLARE
    v_version INTEGER;
    v_changed_fields JSONB := '{}';
    v_action_type VARCHAR(50);
    v_old_value TEXT;
    v_new_value TEXT;
    r RECORD;
BEGIN
    -- Get next version number for this item
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version
    FROM hardgoods_item_history
    WHERE item_id = COALESCE(NEW.item_id, OLD.item_id);

    IF TG_OP = 'INSERT' THEN
        v_action_type := 'ITEM_CREATED';
        v_changed_fields := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Determine action type based on what changed
        IF OLD.status != NEW.status THEN
            v_action_type := NEW.status || '_STATUS';
        ELSE
            v_action_type := 'UPDATED';
        END IF;

        -- Build changed fields object
        FOR r IN
            SELECT key,
                   OLD_T.value as old_val,
                   NEW_T.value as new_val
            FROM jsonb_each(to_jsonb(OLD)) AS OLD_T(key, value)
            FULL OUTER JOIN jsonb_each(to_jsonb(NEW)) AS NEW_T(key, value) USING (key)
            WHERE OLD_T.value IS DISTINCT FROM NEW_T.value
              AND key NOT IN ('updated_at')
        LOOP
            v_changed_fields := v_changed_fields || jsonb_build_object(
                r.key, jsonb_build_object('old', r.old_val, 'new', r.new_val)
            );
        END LOOP;

        -- Skip if no meaningful changes
        IF v_changed_fields = '{}' THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Insert history record
    INSERT INTO hardgoods_item_history (
        item_id, version_number, changed_by, action_type, changed_fields
    ) VALUES (
        NEW.item_id, v_version, NEW.last_updated_by, v_action_type, v_changed_fields
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_hardgoods_changes ON hardgoods;
CREATE TRIGGER track_hardgoods_changes
    AFTER INSERT OR UPDATE ON hardgoods
    FOR EACH ROW
    EXECUTE FUNCTION track_hardgoods_changes();

-- ============================================
-- 9. UTILITY FUNCTIONS
-- ============================================

-- Function to get hardgoods history
CREATE OR REPLACE FUNCTION get_hardgoods_history(p_item_id VARCHAR(15))
RETURNS TABLE (
    history_id BIGINT,
    version_number INTEGER,
    changed_at TIMESTAMPTZ,
    changed_by INTEGER,
    action_type VARCHAR(50),
    changed_fields JSONB,
    change_notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT h.history_id, h.version_number, h.changed_at, h.changed_by,
           h.action_type, h.changed_fields, h.change_notes
    FROM hardgoods_item_history h
    WHERE h.item_id = p_item_id
    ORDER BY h.version_number ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get low stock SKUs
CREATE OR REPLACE FUNCTION get_low_stock_hardgoods()
RETURNS TABLE (
    item_id VARCHAR(15),
    sku_id VARCHAR(30),
    sku_name VARCHAR(200),
    quantity INTEGER,
    reorder_level INTEGER,
    category_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT h.item_id, h.sku_id, s.sku_name, h.quantity, s.reorder_level, c.category_name
    FROM hardgoods h
    JOIN hardgoods_sku s ON h.sku_id = s.sku_id
    JOIN hardgoods_category c ON h.category_id = c.id
    WHERE h.tracking_type IN ('SKU', 'HYBRID')
      AND h.quantity <= s.reorder_level
      AND h.status = 'ACTIVE'
    ORDER BY h.quantity ASC;
END;
$$ LANGUAGE plpgsql;
