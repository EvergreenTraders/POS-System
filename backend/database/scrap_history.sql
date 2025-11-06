-- Create scrap_bucket_history table to track all changes and actions
CREATE TABLE IF NOT EXISTS scrap_bucket_history (
    history_id SERIAL PRIMARY KEY,
    bucket_id INTEGER NOT NULL REFERENCES scrap(bucket_id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    performed_by INTEGER REFERENCES employees(employee_id),
    old_value TEXT,
    new_value TEXT,
    notes TEXT
);

-- Create index on bucket_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_scrap_history_bucket_id ON scrap_bucket_history(bucket_id);

-- Create index on action_date for sorting
CREATE INDEX IF NOT EXISTS idx_scrap_history_action_date ON scrap_bucket_history(action_date);

-- Function to automatically log status changes
CREATE OR REPLACE FUNCTION log_scrap_bucket_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status change
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO scrap_bucket_history (
            bucket_id,
            action_type,
            performed_by,
            old_value,
            new_value,
            notes
        ) VALUES (
            NEW.bucket_id,
            'STATUS_CHANGE',
            NEW.updated_by,
            OLD.status,
            NEW.status,
            'Status changed from ' || OLD.status || ' to ' || NEW.status
        );
    END IF;

    -- Log when bucket is created
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO scrap_bucket_history (
            bucket_id,
            action_type,
            performed_by,
            new_value,
            notes
        ) VALUES (
            NEW.bucket_id,
            'BUCKET_CREATED',
            NEW.created_by,
            NEW.status,
            'Bucket created with name: ' || NEW.bucket_name
        );
    END IF;

    -- Log when shipping info is added
    IF (TG_OP = 'UPDATE' AND OLD.refiner_customer_id IS NULL AND NEW.refiner_customer_id IS NOT NULL) THEN
        INSERT INTO scrap_bucket_history (
            bucket_id,
            action_type,
            performed_by,
            new_value,
            notes
        ) VALUES (
            NEW.bucket_id,
            'SHIPPING_INFO_ADDED',
            NEW.updated_by,
            'Refiner: ' || NEW.refiner_customer_id || ', Shipper: ' || COALESCE(NEW.shipper, 'N/A') || ', Tracking: ' || COALESCE(NEW.tracking_number, 'N/A'),
            'Shipping information added'
        );
    END IF;

    -- Log when processing info is added
    IF (TG_OP = 'UPDATE' AND OLD.date_received IS NULL AND NEW.date_received IS NOT NULL) THEN
        INSERT INTO scrap_bucket_history (
            bucket_id,
            action_type,
            performed_by,
            new_value,
            notes
        ) VALUES (
            NEW.bucket_id,
            'PROCESSING_INFO_ADDED',
            NEW.updated_by,
            'Date Received: ' || NEW.date_received || ', Weight: ' || COALESCE(NEW.weight_received::TEXT, 'N/A') || 'g',
            'Processing information added'
        );
    END IF;

    -- Log when completion info is added
    IF (TG_OP = 'UPDATE' AND OLD.final_weight IS NULL AND NEW.final_weight IS NOT NULL) THEN
        INSERT INTO scrap_bucket_history (
            bucket_id,
            action_type,
            performed_by,
            new_value,
            notes
        ) VALUES (
            NEW.bucket_id,
            'COMPLETION_INFO_ADDED',
            NEW.updated_by,
            'Final Weight: ' || NEW.final_weight || 'g, Assay: ' || COALESCE(NEW.assay::TEXT, 'N/A') || '%',
            'Completion information added'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for scrap table
DROP TRIGGER IF EXISTS trg_log_scrap_bucket_changes ON scrap;
CREATE TRIGGER trg_log_scrap_bucket_changes
AFTER INSERT OR UPDATE ON scrap
FOR EACH ROW
EXECUTE FUNCTION log_scrap_bucket_status_change();

-- Function to manually log custom actions
CREATE OR REPLACE FUNCTION log_scrap_bucket_action(
    p_bucket_id INTEGER,
    p_action_type VARCHAR(50),
    p_performed_by INTEGER,
    p_notes TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO scrap_bucket_history (
        bucket_id,
        action_type,
        performed_by,
        notes
    ) VALUES (
        p_bucket_id,
        p_action_type,
        p_performed_by,
        p_notes
    );
END;
$$ LANGUAGE plpgsql;
