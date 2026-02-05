-- Store Sessions Management
-- Tracks store opening and closing for daily operations

-- Create store_sessions table
CREATE TABLE IF NOT EXISTS store_sessions (
    session_id SERIAL PRIMARY KEY,

    -- Session timing
    opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,

    -- Employee tracking
    opened_by INTEGER NOT NULL,
    closed_by INTEGER,

    -- Notes
    opening_notes TEXT,
    closing_notes TEXT,

    -- Status: open, closed
    status VARCHAR(20) NOT NULL DEFAULT 'open',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (opened_by) REFERENCES employees(employee_id),
    FOREIGN KEY (closed_by) REFERENCES employees(employee_id),

    CONSTRAINT chk_store_session_status CHECK (status IN ('open', 'closed'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_sessions_status ON store_sessions(status);
CREATE INDEX IF NOT EXISTS idx_store_sessions_opened_at ON store_sessions(opened_at);
CREATE INDEX IF NOT EXISTS idx_store_sessions_opened_by ON store_sessions(opened_by);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_store_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for timestamp updates
DROP TRIGGER IF EXISTS update_store_sessions_timestamp ON store_sessions;
CREATE TRIGGER update_store_sessions_timestamp
    BEFORE UPDATE ON store_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_store_sessions_timestamp();

-- Function to auto-set closed_at when status changes to closed
CREATE OR REPLACE FUNCTION update_store_session_closed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'closed' AND OLD.status = 'open' THEN
        NEW.closed_at := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set closed_at
DROP TRIGGER IF EXISTS trigger_store_session_closed_at ON store_sessions;
CREATE TRIGGER trigger_store_session_closed_at
    BEFORE UPDATE ON store_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_store_session_closed_at();

-- View for current store status
CREATE OR REPLACE VIEW current_store_status AS
SELECT
    s.session_id,
    s.status,
    s.opened_at,
    s.closed_at,
    s.opened_by,
    e_open.first_name || ' ' || e_open.last_name AS opened_by_name,
    s.closed_by,
    e_close.first_name || ' ' || e_close.last_name AS closed_by_name,
    s.opening_notes,
    s.closing_notes
FROM store_sessions s
LEFT JOIN employees e_open ON s.opened_by = e_open.employee_id
LEFT JOIN employees e_close ON s.closed_by = e_close.employee_id
WHERE s.status = 'open'
ORDER BY s.opened_at DESC
LIMIT 1;

-- Add comments for documentation
COMMENT ON TABLE store_sessions IS 'Tracks store opening and closing sessions for daily operations';
COMMENT ON COLUMN store_sessions.status IS 'Store status: open or closed';
COMMENT ON COLUMN store_sessions.opened_by IS 'Employee who opened the store';
COMMENT ON COLUMN store_sessions.closed_by IS 'Employee who closed the store';

-- Ensure session_id starts at 1000 for 4-digit IDs
SELECT setval('store_sessions_session_id_seq', GREATEST(COALESCE((SELECT MAX(session_id) FROM store_sessions), 0) + 1, 1000), false);
