-- Create scrap table with the same structure as jewelry table
drop table if exists scrap;
CREATE TABLE IF NOT EXISTS scrap (
    -- Same structure as jewelry table
    item_id VARCHAR(10) PRIMARY KEY,
    -- Basic item info
    long_desc TEXT,
    short_desc TEXT,
    category VARCHAR(50) NOT NULL,
    brand VARCHAR(100),
    vintage BOOLEAN DEFAULT false,
    stamps TEXT,
    images JSONB DEFAULT '[]',
    notes TEXT,
    
    -- Metal details
    metal_weight DECIMAL(10,2) NOT NULL,
    precious_metal_type VARCHAR(50),
    non_precious_metal_type VARCHAR(50),
    metal_purity VARCHAR(50),
    jewelry_color VARCHAR(50),
    purity_value DECIMAL(5,3),
    metal_spot_price DECIMAL(10,2) DEFAULT 0.00,
    est_metal_value DECIMAL(10,2),
    
    -- Gem details
    primary_gem_type VARCHAR(50),
    primary_gem_category VARCHAR(20) CHECK (primary_gem_category IS NULL OR primary_gem_category IN ('diamond', 'stone')),
    primary_gem_size VARCHAR(20),
    primary_gem_quantity INTEGER,
    primary_gem_shape VARCHAR(50),
    primary_gem_weight DECIMAL(10,3),
    primary_gem_color VARCHAR(50),
    primary_gem_exact_color CHAR(1),
    primary_gem_clarity VARCHAR(50),
    primary_gem_cut VARCHAR(50),
    primary_gem_lab_grown BOOLEAN DEFAULT false,
    primary_gem_authentic BOOLEAN DEFAULT false,
    primary_gem_value DECIMAL(10,2),
    
    -- Pricing
    buy_price DECIMAL(10,2),
    pawn_value DECIMAL(10,2),
    retail_price DECIMAL(10,2),
    
    -- Status and tracking
    status VARCHAR(20) NOT NULL DEFAULT 'SCRAP',
    location VARCHAR(50),
    condition VARCHAR(50),
    
    -- Dates
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    moved_to_scrap_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Original item metadata
    original_item_id VARCHAR(10),
    moved_by INTEGER,
    
    -- Constraints
    CONSTRAINT valid_metal_weight CHECK (metal_weight > 0),
    CONSTRAINT valid_buy_price CHECK (buy_price >= 0),
    CONSTRAINT valid_pawn_value CHECK (pawn_value >= 0),
    CONSTRAINT valid_retail_price CHECK (retail_price >= 0)
);

-- Create indexes for common queries
CREATE INDEX idx_scrap_metal_type ON scrap(precious_metal_type);
CREATE INDEX idx_scrap_category ON scrap(category);
CREATE INDEX idx_scrap_created_at ON scrap(created_at);
CREATE INDEX idx_scrap_moved_at ON scrap(moved_to_scrap_at);

-- Add table comments
COMMENT ON TABLE scrap IS 'Stores items that have been moved to scrap from the jewelry inventory';
COMMENT ON COLUMN scrap.moved_to_scrap_at IS 'When the item was moved to scrap';
COMMENT ON COLUMN scrap.original_item_id IS 'Original item_id from the jewelry table';
COMMENT ON COLUMN scrap.moved_by IS 'ID of the employee who moved the item to scrap';

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_scrap_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_scrap_timestamp
    BEFORE UPDATE ON scrap
    FOR EACH ROW
    EXECUTE FUNCTION update_scrap_timestamp();

-- First drop the function if it exists
DROP FUNCTION IF EXISTS move_to_scrap(VARCHAR(10), INTEGER);

-- Function to move an item to scrap with proper transaction handling
CREATE OR REPLACE FUNCTION move_to_scrap(
    p_item_id VARCHAR(10),
    p_moved_by INTEGER
) 
RETURNS VOID AS $$
DECLARE
    v_old_status TEXT;
    v_jewelry_record RECORD;
    v_next_version INTEGER;
BEGIN
    -- Start a transaction block
    BEGIN
        -- Get the current jewelry record and lock it
        SELECT j.*, j.status AS current_status 
        INTO v_jewelry_record
        FROM jewelry j
        WHERE j.item_id = p_item_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item % not found', p_item_id;
        END IF;

        -- Get next version number for history
        SELECT COALESCE(MAX(version_number), 0) + 1 
        INTO v_next_version
        FROM jewelry_item_history
        WHERE item_id = p_item_id;

        -- Store the old status for history
        v_old_status := v_jewelry_record.status;

        -- Insert into scrap table with all fields from jewelry
        INSERT INTO scrap (
            item_id, long_desc, short_desc, category, brand, vintage, stamps, images, notes,
            metal_weight, precious_metal_type, non_precious_metal_type, metal_purity,
            jewelry_color, purity_value, metal_spot_price, est_metal_value,
            primary_gem_type, primary_gem_category, primary_gem_size, primary_gem_quantity,
            primary_gem_shape, primary_gem_weight, primary_gem_color, primary_gem_exact_color,
            primary_gem_clarity, primary_gem_cut, primary_gem_lab_grown, primary_gem_authentic,
            primary_gem_value, buy_price, pawn_value, retail_price, status, location, condition,
            created_at, updated_at, moved_to_scrap_at, original_item_id, moved_by
        )
        SELECT 
            item_id, 
            long_desc, 
            short_desc, 
            category, 
            brand, 
            vintage, 
            stamps, 
            images, 
            notes,
            metal_weight, 
            precious_metal_type, 
            non_precious_metal_type, 
            metal_purity,
            jewelry_color, 
            purity_value, 
            metal_spot_price, 
            est_metal_value,
            primary_gem_type, 
            primary_gem_category, 
            primary_gem_size,
            primary_gem_quantity,
            primary_gem_shape, 
            primary_gem_weight, 
            primary_gem_color, 
            primary_gem_exact_color,
            primary_gem_clarity, 
            primary_gem_cut, 
            primary_gem_lab_grown, 
            primary_gem_authentic,
            primary_gem_value, 
            buy_price, 
            pawn_value, 
            retail_price, 
            'SCRAP' as status, 
            location, 
            condition,
            created_at, 
            updated_at, 
            CURRENT_TIMESTAMP, 
            item_id, 
            p_moved_by
        FROM jewelry
        WHERE item_id = p_item_id;
        
        -- Log the action in history before deleting
        INSERT INTO jewelry_item_history (
            item_id,
            version_number,
            changed_by,
            action_type,
            changed_fields,
            change_notes
        ) VALUES (
            p_item_id,
            v_next_version,
            p_moved_by,
            'MOVED_TO_SCRAP',
            jsonb_build_object(
                'status', jsonb_build_object(
                    'from', v_old_status,
                    'to', 'SCRAP'
                )
            ),
            'Item moved to scrap'
        );
        
        -- Delete related secondary gems
        DELETE FROM jewelry_secondary_gems WHERE item_id = p_item_id;
        
        -- Finally, delete from jewelry table
        DELETE FROM jewelry WHERE item_id = p_item_id;

    EXCEPTION WHEN OTHERS THEN
        -- Rollback the transaction on error
        RAISE EXCEPTION 'Error moving item to scrap: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;
