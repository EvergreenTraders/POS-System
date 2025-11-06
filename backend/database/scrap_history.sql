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
DECLARE
    v_refiner_name TEXT;
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

    -- Log when shipping info is added or updated
    IF (TG_OP = 'UPDATE' AND (
        OLD.refiner_customer_id IS DISTINCT FROM NEW.refiner_customer_id OR
        OLD.shipper IS DISTINCT FROM NEW.shipper OR
        OLD.tracking_number IS DISTINCT FROM NEW.tracking_number
    )) THEN
        -- Get refiner customer name
        SELECT COALESCE(first_name || ' ' || last_name, 'Unknown Refiner')
        INTO v_refiner_name
        FROM customers
        WHERE id = NEW.refiner_customer_id;

        IF OLD.refiner_customer_id IS NULL THEN
            -- First time adding shipping info
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
                'Refiner: ' || v_refiner_name || ', Shipper: ' || COALESCE(NEW.shipper, 'N/A') || ', Tracking: ' || COALESCE(NEW.tracking_number, 'N/A'),
                'Package shipped to ' || v_refiner_name
            );
        ELSE
            -- Updating existing shipping info
            INSERT INTO scrap_bucket_history (
                bucket_id,
                action_type,
                performed_by,
                new_value,
                notes
            ) VALUES (
                NEW.bucket_id,
                'SHIPPING_INFO_UPDATED',
                NEW.updated_by,
                'Refiner: ' || v_refiner_name || ', Shipper: ' || COALESCE(NEW.shipper, 'N/A') || ', Tracking: ' || COALESCE(NEW.tracking_number, 'N/A'),
                'Shipping information updated'
            );
        END IF;
    END IF;

    -- Log when processing info is added or updated
    IF (TG_OP = 'UPDATE' AND (
        OLD.date_received IS DISTINCT FROM NEW.date_received OR
        OLD.weight_received IS DISTINCT FROM NEW.weight_received OR
        OLD.locked_spot_price IS DISTINCT FROM NEW.locked_spot_price OR
        OLD.payment_advance IS DISTINCT FROM NEW.payment_advance
    )) THEN
        -- Get refiner customer name
        SELECT COALESCE(first_name || ' ' || last_name, 'refiner')
        INTO v_refiner_name
        FROM customers
        WHERE id = NEW.refiner_customer_id;

        IF OLD.date_received IS NULL THEN
            -- First time adding processing info
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
                'Package received by ' || v_refiner_name
            );
        ELSE
            -- Updating existing processing info
            INSERT INTO scrap_bucket_history (
                bucket_id,
                action_type,
                performed_by,
                new_value,
                notes
            ) VALUES (
                NEW.bucket_id,
                'PROCESSING_INFO_UPDATED',
                NEW.updated_by,
                'Date Received: ' || NEW.date_received || ', Weight: ' || COALESCE(NEW.weight_received::TEXT, 'N/A') || 'g',
                'Processing information updated'
            );
        END IF;
    END IF;

    -- Log when completion info is added or updated
    IF (TG_OP = 'UPDATE' AND (
        OLD.final_weight IS DISTINCT FROM NEW.final_weight OR
        OLD.assay IS DISTINCT FROM NEW.assay OR
        OLD.total_settlement_amount IS DISTINCT FROM NEW.total_settlement_amount OR
        OLD.final_payment_amount IS DISTINCT FROM NEW.final_payment_amount
    )) THEN
        IF OLD.final_weight IS NULL THEN
            -- First time adding completion info
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
        ELSE
            -- Updating existing completion info
            INSERT INTO scrap_bucket_history (
                bucket_id,
                action_type,
                performed_by,
                new_value,
                notes
            ) VALUES (
                NEW.bucket_id,
                'COMPLETION_INFO_UPDATED',
                NEW.updated_by,
                'Final Weight: ' || NEW.final_weight || 'g, Assay: ' || COALESCE(NEW.assay::TEXT, 'N/A') || '%',
                'Completion information updated'
            );
        END IF;
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
