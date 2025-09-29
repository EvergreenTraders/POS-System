-- =============================================
-- Jewelry Item History Tracking System
-- For Pawn Shop Inventory Management
-- =============================================

-- =============================================
-- 1. Create the version history table
-- =============================================
CREATE TABLE IF NOT EXISTS jewelry_item_history (
    history_id BIGSERIAL PRIMARY KEY,
    item_id VARCHAR(10) NOT NULL,
    version_number INTEGER NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    changed_fields JSONB NOT NULL,
    change_notes TEXT,
    FOREIGN KEY (item_id) REFERENCES jewelry(item_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES employees(employee_id)
);

-- =============================================
-- 2. Create indexes for better performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_jewelry_history_item_id ON jewelry_item_history(item_id);
CREATE INDEX IF NOT EXISTS idx_jewelry_history_changed_at ON jewelry_item_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_jewelry_history_action_type ON jewelry_item_history(action_type);

-- =============================================
-- 3. Create function to track changes
-- =============================================
CREATE OR REPLACE FUNCTION track_jewelry_changes()
RETURNS TRIGGER AS $$
DECLARE
    new_version INTEGER;
    diff JSONB := '{}'::JSONB;
    key TEXT;
    old_json JSONB;
    new_json JSONB;
    current_action TEXT;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO new_version
    FROM jewelry_item_history
    WHERE item_id = COALESCE(NEW.item_id, OLD.item_id);
    
    -- For new items
    IF TG_OP = 'INSERT' THEN
        -- Convert all fields to JSONB
        new_json := to_jsonb(NEW);
        
        -- Remove system fields
        new_json := new_json - 'last_updated' - 'last_updated_by' - 'change_notes';
        
        -- Create initial version
        INSERT INTO jewelry_item_history (
            item_id,
            version_number,
            changed_by,
            action_type,
            changed_fields,
            change_notes
        ) VALUES (
            NEW.item_id,
            1,
            COALESCE(NEW.last_updated_by, 0),
            'ITEM_CREATED',
            jsonb_build_object('initial_data', new_json),
            COALESCE(NEW.change_notes, 'Item created in system')
        );
        
    -- For updates
    ELSIF TG_OP = 'UPDATE' THEN
        -- Determine action type based on status change
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            current_action := UPPER(NEW.status) || '_STATUS';
        ELSE
            current_action := 'UPDATED';
        END IF;
        
        -- Convert to JSONB and remove system fields
        old_json := to_jsonb(OLD) - 'last_updated' - 'last_updated_by' - 'change_notes';
        new_json := to_jsonb(NEW) - 'last_updated' - 'last_updated_by' - 'change_notes';
        
        -- Find changed fields
        FOR key IN (SELECT jsonb_object_keys(new_json)) LOOP
            IF (old_json->>key) IS DISTINCT FROM (new_json->>key) THEN
                diff := diff || jsonb_build_object(key, jsonb_build_object(
                    'old', old_json->key,
                    'new', new_json->key
                ));
            END IF;
        END LOOP;
        
        -- Only create version if there are changes
        IF jsonb_typeof(diff) = 'object' AND jsonb_typeof(diff) IS NOT NULL AND jsonb_object_keys(diff) IS NOT NULL THEN
            INSERT INTO jewelry_item_history (
                item_id,
                version_number,
                changed_by,
                action_type,
                changed_fields,
                change_notes
            ) VALUES (
                NEW.item_id,
                new_version,
                COALESCE(NEW.last_updated_by, 0),
                current_action,
                diff,
                NEW.change_notes
            );
        END IF;
    END IF;
    
    -- Clear change_notes to avoid carrying it over to next update
    IF TG_OP = 'UPDATE' THEN
        NEW.change_notes := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. Create the trigger
-- =============================================
DROP TRIGGER IF EXISTS trg_jewelry_changes ON jewelry;
-- CREATE TRIGGER trg_jewelry_changes
-- AFTER INSERT OR UPDATE ON jewelry
-- FOR EACH ROW
-- EXECUTE FUNCTION track_jewelry_changes();

-- =============================================
-- 5. Add change_notes column to jewelry table if it doesn't exist
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'jewelry' AND column_name = 'change_notes') THEN
        ALTER TABLE jewelry ADD COLUMN change_notes TEXT;
    END IF;
END $$;

-- =============================================
-- 6. Utility Functions
-- =============================================

-- Function to get item history
CREATE OR REPLACE FUNCTION get_item_history(p_item_id VARCHAR(10))
RETURNS TABLE (
    version_number INTEGER,
    changed_at TIMESTAMPTZ,
    changed_by_name TEXT,
    action_type VARCHAR(50),
    changes JSONB,
    change_notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jh.version_number,
        jh.changed_at,
        e.first_name || ' ' || e.last_name as changed_by_name,
        jh.action_type,
        jh.changed_fields as changes,
        jh.change_notes
    FROM jewelry_item_history jh
    JOIN employees e ON jh.changed_by = e.employee_id
    WHERE jh.item_id = p_item_id
    ORDER BY jh.version_number DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get item state at a specific time
CREATE OR REPLACE FUNCTION get_item_at_time(
    p_item_id VARCHAR(10),
    p_timestamp TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH versioned_changes AS (
        -- Initial data
        SELECT 
            (jsonb_each(changed_fields->'initial_data')).* 
        FROM jewelry_item_history 
        WHERE item_id = p_item_id 
        AND action_type = 'ITEM_CREATED'
        
        UNION ALL
        
        -- All subsequent changes
        SELECT 
            key,
            value->'new'
        FROM jewelry_item_history,
        jsonb_each(changed_fields) as e
        WHERE item_id = p_item_id
        AND action_type != 'ITEM_CREATED'
        AND changed_at <= p_timestamp
    )
    SELECT jsonb_object_agg(key, value)
    INTO result
    FROM (
        SELECT DISTINCT ON (key) key, value
        FROM versioned_changes
        WHERE key != 'initial_data'
        ORDER BY key, 
            CASE 
                WHEN key = 'initial_data' THEN 0 
                ELSE 1 
            END
    ) t;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get change history between two dates
CREATE OR REPLACE FUNCTION get_changes_between_dates(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
) RETURNS TABLE (
    item_id VARCHAR(10),
    short_desc TEXT,
    changed_at TIMESTAMPTZ,
    changed_by_name TEXT,
    action_type VARCHAR(50),
    change_notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jh.item_id,
        j.short_desc,
        jh.changed_at,
        e.first_name || ' ' || e.last_name as changed_by_name,
        jh.action_type,
        jh.change_notes
    FROM jewelry_item_history jh
    JOIN jewelry j ON jh.item_id = j.item_id
    JOIN employees e ON jh.changed_by = e.employee_id
    WHERE jh.changed_at BETWEEN p_start_date AND p_end_date
    ORDER BY jh.changed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. Common Queries (for reference)
-- =============================================
/*
-- Get complete history for an item
SELECT * FROM get_item_history('ITEM123');

-- See item state at specific time
SELECT * FROM get_item_at_time('ITEM123', '2025-01-01 12:00:00-05');

-- Get all price changes for an item
SELECT 
    changed_at,
    changed_by_name,
    (changes->'retail_price'->>'new')::numeric as new_price,
    (changes->'retail_price'->>'old')::numeric as old_price,
    change_notes
FROM get_item_history('ITEM123')
WHERE changes ? 'retail_price';

-- Get all status changes for an item
SELECT 
    changed_at,
    changed_by_name,
    action_type,
    change_notes
FROM get_item_history('ITEM123')
WHERE action_type LIKE '%STATUS%';

-- Get all changes in a date range
SELECT * FROM get_changes_between_dates(
    '2025-01-01 00:00:00-05',
    '2025-12-31 23:59:59-05'
);
*/

-- =============================================
-- 8. Add comments for documentation
-- =============================================
COMMENT ON TABLE jewelry_item_history IS 'Tracks all changes to jewelry items with complete version history';
COMMENT ON COLUMN jewelry_item_history.changed_fields IS 'JSON object containing only the fields that were changed';
COMMENT ON COLUMN jewelry_item_history.action_type IS 'Type of action: ITEM_CREATED, UPDATED, [STATUS]_STATUS (e.g., SOLD_STATUS, PAWNED_STATUS)';

-- =============================================
-- 9. Grant permissions 
-- =============================================
-- GRANT SELECT, INSERT ON jewelry_item_history TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE jewelry_item_history_history_id_seq TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;