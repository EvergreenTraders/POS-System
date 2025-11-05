

-- Create scrap table with bucket information and jewelry items array
CREATE TABLE IF NOT EXISTS scrap (
    bucket_id SERIAL PRIMARY KEY,
    bucket_name VARCHAR(100) NOT NULL UNIQUE,
    item_id JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    weight_photo BYTEA
);

-- Create index on bucket_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_scrap_bucket_name ON scrap(bucket_name);

-- Create GIN index on the item_id JSONB array for better query performance
CREATE INDEX IF NOT EXISTS idx_scrap_item_id_gin ON scrap USING GIN (item_id jsonb_path_ops);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_scrap_row_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamps
DROP TRIGGER IF EXISTS trg_update_scrap_timestamp ON scrap;
CREATE TRIGGER trg_update_scrap_timestamp
BEFORE UPDATE ON scrap
FOR EACH ROW
EXECUTE FUNCTION update_scrap_row_timestamp();

-- First drop the function if it exists
DROP FUNCTION IF EXISTS move_to_scrap(VARCHAR(10), INTEGER, VARCHAR(100));

-- Function to move an item to scrap with bucket support (append item_id to bucket array)
CREATE OR REPLACE FUNCTION move_to_scrap(
    p_item_id VARCHAR(10),
    p_moved_by INTEGER,
    p_bucket_name VARCHAR(100)
) 
RETURNS VOID AS $$
DECLARE
    v_old_status TEXT;
    v_next_version INTEGER;
    v_bucket_id INTEGER;
BEGIN
    -- Lock the item row and fetch current status
    SELECT status
      INTO v_old_status
      FROM jewelry
     WHERE item_id = p_item_id
     FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item % not found', p_item_id;
    END IF;

    -- Compute next history version
    SELECT COALESCE(MAX(version_number), 0) + 1 
      INTO v_next_version
      FROM jewelry_item_history
     WHERE item_id = p_item_id;

    -- Ensure bucket exists or create it
    SELECT bucket_id INTO v_bucket_id FROM scrap WHERE bucket_name = p_bucket_name;
    IF v_bucket_id IS NULL THEN
        INSERT INTO scrap (bucket_name, created_by, notes)
        VALUES (p_bucket_name, p_moved_by, 'Created automatically when moving item to scrap')
        RETURNING bucket_id INTO v_bucket_id;
    END IF;

    -- Append item_id to the bucket's array if not already present
    UPDATE scrap s
       SET item_id = CASE 
                        WHEN NOT EXISTS (
                            SELECT 1 
                              FROM jsonb_array_elements_text(COALESCE(s.item_id, '[]'::jsonb)) AS e(val)
                             WHERE e.val = p_item_id
                        )
                        THEN COALESCE(s.item_id, '[]'::jsonb) || jsonb_build_array(p_item_id)
                        ELSE s.item_id
                      END,
           updated_at = CURRENT_TIMESTAMP,
           updated_by = p_moved_by
     WHERE s.bucket_id = v_bucket_id;

    -- Update the item status in jewelry (do not delete)
    UPDATE jewelry
       SET status = 'SCRAP PROCESS',
           updated_at = CURRENT_TIMESTAMP,
           moved_to_scrap_at = CURRENT_TIMESTAMP,
           moved_by = p_moved_by
     WHERE item_id = p_item_id;

    -- Log in history
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
                'to', 'SCRAP PROCESS'
            )
        ),
        'Item moved to scrap and added to bucket '
        || p_bucket_name
    );

END;
$$ LANGUAGE plpgsql;

-- Add weight_photo column if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'scrap'
        AND column_name = 'weight_photo'
    ) THEN
        ALTER TABLE scrap ADD COLUMN weight_photo BYTEA;
    END IF;
END $$;
