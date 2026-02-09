-- Inter-Store Transfers Management
-- Tracks money transfers between different store locations

-- Create stores table to track multiple store locations
CREATE TABLE IF NOT EXISTS stores (
    store_id SERIAL PRIMARY KEY,
    store_name VARCHAR(100) NOT NULL,
    store_code VARCHAR(20) UNIQUE, -- Short code for identification (e.g., "MAIN", "NORTH", "SOUTH")
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_current_store BOOLEAN NOT NULL DEFAULT FALSE, -- Only one store should be marked as current
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Create index for stores
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_stores_current ON stores(is_current_store);

-- Add comments for documentation
COMMENT ON TABLE stores IS 'Stores multiple store/branch locations for the business';
COMMENT ON COLUMN stores.store_code IS 'Short unique code for identifying the store (e.g., MAIN, NORTH)';
COMMENT ON COLUMN stores.is_current_store IS 'Indicates if this is the current store location (only one should be true)';

-- Insert default "This Store" entry if none exists
INSERT INTO stores (store_name, store_code, is_current_store)
SELECT 'This Store', 'CURRENT', TRUE
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE is_current_store = TRUE);

-- Create inter_store_transfers table to track transfers between stores
CREATE TABLE IF NOT EXISTS inter_store_transfers (
    transfer_id SERIAL PRIMARY KEY,

    -- Source and destination stores
    source_store_id INTEGER NOT NULL,
    destination_store_id INTEGER NOT NULL,

    -- Transfer details
    amount DECIMAL(10,2) NOT NULL,
    transfer_type VARCHAR(20) NOT NULL DEFAULT 'cash', -- 'cash', 'check', 'mixed'

    -- Status: pending (sent but not received), received, cancelled
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Source session (where money was taken from)
    source_session_id INTEGER,
    source_adjustment_id INTEGER,

    -- Destination session (where money was deposited - filled when received)
    destination_session_id INTEGER,
    destination_adjustment_id INTEGER,

    -- Tracking
    sent_by INTEGER NOT NULL, -- Employee who sent
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_by INTEGER, -- Employee who received
    received_at TIMESTAMP,
    cancelled_by INTEGER,
    cancelled_at TIMESTAMP,

    -- Notes
    send_notes TEXT,
    receive_notes TEXT,
    cancel_reason TEXT,

    -- Reference number for tracking
    reference_number VARCHAR(50),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,

    FOREIGN KEY (source_store_id) REFERENCES stores(store_id),
    FOREIGN KEY (destination_store_id) REFERENCES stores(store_id),
    FOREIGN KEY (source_session_id) REFERENCES cash_drawer_sessions(session_id) ON DELETE SET NULL,
    FOREIGN KEY (source_adjustment_id) REFERENCES cash_drawer_adjustments(adjustment_id) ON DELETE SET NULL,
    FOREIGN KEY (destination_session_id) REFERENCES cash_drawer_sessions(session_id) ON DELETE SET NULL,
    FOREIGN KEY (destination_adjustment_id) REFERENCES cash_drawer_adjustments(adjustment_id) ON DELETE SET NULL,
    FOREIGN KEY (sent_by) REFERENCES employees(employee_id),
    FOREIGN KEY (received_by) REFERENCES employees(employee_id),
    FOREIGN KEY (cancelled_by) REFERENCES employees(employee_id),

    CONSTRAINT chk_transfer_status CHECK (status IN ('pending', 'received', 'cancelled')),
    CONSTRAINT chk_positive_amount CHECK (amount > 0),
    CONSTRAINT chk_different_stores CHECK (source_store_id != destination_store_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inter_store_transfers_source ON inter_store_transfers(source_store_id);
CREATE INDEX IF NOT EXISTS idx_inter_store_transfers_dest ON inter_store_transfers(destination_store_id);
CREATE INDEX IF NOT EXISTS idx_inter_store_transfers_status ON inter_store_transfers(status);
CREATE INDEX IF NOT EXISTS idx_inter_store_transfers_sent_at ON inter_store_transfers(sent_at);

-- Add comments for documentation
COMMENT ON TABLE inter_store_transfers IS 'Tracks money transfers between different store locations';
COMMENT ON COLUMN inter_store_transfers.status IS 'Transfer status: pending (sent but not received), received (completed), cancelled';
COMMENT ON COLUMN inter_store_transfers.reference_number IS 'Reference number for tracking the physical transfer';

-- Function to generate transfer reference number
CREATE OR REPLACE FUNCTION generate_transfer_reference()
RETURNS TEXT AS $$
DECLARE
    v_date TEXT;
    v_seq INTEGER;
    v_ref TEXT;
BEGIN
    v_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

    -- Get the next sequence number for today
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(reference_number FROM 10) AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM inter_store_transfers
    WHERE reference_number LIKE 'IST' || v_date || '%';

    v_ref := 'IST' || v_date || LPAD(v_seq::TEXT, 3, '0');

    RETURN v_ref;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_inter_store_transfer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for timestamp updates
DROP TRIGGER IF EXISTS update_inter_store_transfers_timestamp ON inter_store_transfers;
CREATE TRIGGER update_inter_store_transfers_timestamp
    BEFORE UPDATE ON inter_store_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_inter_store_transfer_timestamp();

-- Function to update stores timestamp
CREATE OR REPLACE FUNCTION update_stores_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stores timestamp updates
DROP TRIGGER IF EXISTS update_stores_timestamp ON stores;
CREATE TRIGGER update_stores_timestamp
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_stores_timestamp();

-- Drop old view and denominations table (cleanup from previous version)
DROP VIEW IF EXISTS pending_inter_store_transfers;
DROP TABLE IF EXISTS inter_store_transfer_denominations;

-- View for pending inter-store transfers (to be received)
CREATE OR REPLACE VIEW pending_inter_store_transfers AS
SELECT
    t.transfer_id,
    t.reference_number,
    t.amount,
    t.transfer_type,
    t.status,
    t.sent_at,
    t.send_notes,
    ss.store_name AS source_store_name,
    ss.store_code AS source_store_code,
    ds.store_name AS destination_store_name,
    ds.store_code AS destination_store_code,
    e.first_name || ' ' || e.last_name AS sent_by_name
FROM inter_store_transfers t
JOIN stores ss ON t.source_store_id = ss.store_id
JOIN stores ds ON t.destination_store_id = ds.store_id
JOIN employees e ON t.sent_by = e.employee_id
WHERE t.status = 'pending'
ORDER BY t.sent_at DESC;

-- View for inter-store transfer history
CREATE OR REPLACE VIEW inter_store_transfer_history AS
SELECT
    t.transfer_id,
    t.reference_number,
    t.amount,
    t.transfer_type,
    t.status,
    t.sent_at,
    t.received_at,
    t.cancelled_at,
    t.send_notes,
    t.receive_notes,
    t.cancel_reason,
    ss.store_name AS source_store_name,
    ss.store_code AS source_store_code,
    ds.store_name AS destination_store_name,
    ds.store_code AS destination_store_code,
    es.first_name || ' ' || es.last_name AS sent_by_name,
    er.first_name || ' ' || er.last_name AS received_by_name,
    ec.first_name || ' ' || ec.last_name AS cancelled_by_name
FROM inter_store_transfers t
JOIN stores ss ON t.source_store_id = ss.store_id
JOIN stores ds ON t.destination_store_id = ds.store_id
JOIN employees es ON t.sent_by = es.employee_id
LEFT JOIN employees er ON t.received_by = er.employee_id
LEFT JOIN employees ec ON t.cancelled_by = ec.employee_id
ORDER BY t.created_at DESC;

-- Ensure transfer_id starts at 1000 for 4-digit IDs
SELECT setval('inter_store_transfers_transfer_id_seq', GREATEST(COALESCE((SELECT MAX(transfer_id) FROM inter_store_transfers), 0) + 1, 1000), false);
