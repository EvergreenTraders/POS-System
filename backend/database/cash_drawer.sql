-- Cash Drawer Management System
-- Tracks cash drawer sessions for employees, including opening/closing balance verification

-- Create drawer_config table to store number of drawers configuration
CREATE TABLE IF NOT EXISTS drawer_config (
    id SERIAL PRIMARY KEY,
    number_of_drawers INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT valid_drawer_count CHECK (number_of_drawers >= 0 AND number_of_drawers <= 50)
);

-- Add comment for documentation
COMMENT ON TABLE drawer_config IS 'Stores configuration for number of cash drawers in the system';
COMMENT ON COLUMN drawer_config.number_of_drawers IS 'Number of physical cash drawers (Safe drawer is always available separately)';

-- Insert default configuration if table is empty
INSERT INTO drawer_config (number_of_drawers)
SELECT 0
WHERE NOT EXISTS (SELECT 1 FROM drawer_config LIMIT 1);

-- Create drawers table to store individual drawer information
CREATE TABLE IF NOT EXISTS drawers (
    drawer_id SERIAL PRIMARY KEY,
    drawer_name VARCHAR(100) NOT NULL UNIQUE,
    drawer_type VARCHAR(20) NOT NULL DEFAULT 'physical', -- 'safe' or 'physical'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT chk_drawer_type CHECK (drawer_type IN ('safe', 'physical'))
);

-- Add comment for documentation
COMMENT ON TABLE drawers IS 'Stores individual drawer information (safe and physical drawers)';
COMMENT ON COLUMN drawers.drawer_name IS 'Name of the drawer (e.g., "Safe", "Drawer 1", "Drawer 2")';
COMMENT ON COLUMN drawers.drawer_type IS 'Type of drawer: safe (vault/safe) or physical (cash drawer)';
COMMENT ON COLUMN drawers.is_active IS 'Whether this drawer is currently active and usable';
COMMENT ON COLUMN drawers.display_order IS 'Order in which drawers should be displayed in the UI';

-- Insert default safe drawer
INSERT INTO drawers (drawer_name, drawer_type, is_active, display_order)
VALUES ('Safe', 'safe', TRUE, 0)
ON CONFLICT (drawer_name) DO NOTHING;

-- Create cash_drawer_sessions table
CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
    session_id SERIAL PRIMARY KEY,
    drawer_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,

    -- Session timing
    opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,

    -- Opening balance
    opening_balance DECIMAL(10,2) NOT NULL,
    opening_notes TEXT,

    -- Expected vs actual closing
    expected_balance DECIMAL(10,2), -- Calculated: opening + cash sales - cash payouts
    actual_balance DECIMAL(10,2), -- Counted by employee at closing
    discrepancy DECIMAL(10,2), -- actual - expected
    closing_notes TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, closed, reconciled

    -- Reconciliation
    reconciled_by INTEGER, -- Manager who verified
    reconciled_at TIMESTAMP,
    reconciliation_notes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (drawer_id) REFERENCES drawers(drawer_id),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (reconciled_by) REFERENCES employees(employee_id),

    CONSTRAINT chk_session_status CHECK (status IN ('open', 'closed', 'reconciled')),
    CONSTRAINT chk_closing_balance CHECK (
        (status = 'open' AND actual_balance IS NULL) OR
        (status IN ('closed', 'reconciled') AND actual_balance IS NOT NULL)
    )
);

-- Create cash_drawer_transactions table
-- Links transactions to drawer sessions (for cash payments only)
CREATE TABLE IF NOT EXISTS cash_drawer_transactions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    transaction_id VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL, -- Positive for sales, negative for refunds
    transaction_type VARCHAR(20) NOT NULL, -- sale, refund, payout
    payment_id INTEGER, -- Reference to payments table
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES cash_drawer_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),

    CONSTRAINT chk_transaction_type CHECK (transaction_type IN ('sale', 'refund', 'payout'))
);

-- Create cash_drawer_adjustments table
-- Track manual cash additions/removals during shift (bank runs, change requests, etc.)
CREATE TABLE IF NOT EXISTS cash_drawer_adjustments (
    adjustment_id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL, -- Positive for additions, negative for removals
    adjustment_type VARCHAR(30) NOT NULL, -- bank_deposit, change_order, petty_cash, other
    reason TEXT NOT NULL,
    performed_by INTEGER NOT NULL, -- Employee who made adjustment
    approved_by INTEGER, -- Manager approval
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES cash_drawer_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES employees(employee_id),
    FOREIGN KEY (approved_by) REFERENCES employees(employee_id),

    CONSTRAINT chk_adjustment_type CHECK (
        adjustment_type IN ('bank_deposit', 'change_order', 'petty_cash', 'correction', 'other')
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drawer_sessions_employee ON cash_drawer_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_drawer_sessions_status ON cash_drawer_sessions(status);
CREATE INDEX IF NOT EXISTS idx_drawer_sessions_opened_at ON cash_drawer_sessions(opened_at);
CREATE INDEX IF NOT EXISTS idx_drawer_transactions_session ON cash_drawer_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_drawer_transactions_transaction ON cash_drawer_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_drawer_adjustments_session ON cash_drawer_adjustments(session_id);

-- Function to calculate expected balance for a session
CREATE OR REPLACE FUNCTION calculate_expected_balance(p_session_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_opening_balance DECIMAL(10,2);
    v_cash_transactions DECIMAL(10,2);
    v_adjustments DECIMAL(10,2);
BEGIN
    -- Get opening balance
    SELECT opening_balance INTO v_opening_balance
    FROM cash_drawer_sessions
    WHERE session_id = p_session_id;

    -- Sum all cash transactions for this session
    SELECT COALESCE(SUM(amount), 0) INTO v_cash_transactions
    FROM cash_drawer_transactions
    WHERE session_id = p_session_id;

    -- Sum all adjustments for this session
    SELECT COALESCE(SUM(amount), 0) INTO v_adjustments
    FROM cash_drawer_adjustments
    WHERE session_id = p_session_id;

    RETURN v_opening_balance + v_cash_transactions + v_adjustments;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update expected balance when closing
CREATE OR REPLACE FUNCTION update_expected_balance_on_close()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('closed', 'reconciled') AND OLD.status = 'open' THEN
        NEW.expected_balance := calculate_expected_balance(NEW.session_id);
        NEW.discrepancy := COALESCE(NEW.actual_balance, 0) - NEW.expected_balance;
        NEW.closed_at := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate expected balance
DROP TRIGGER IF EXISTS trigger_update_expected_balance ON cash_drawer_sessions;
CREATE TRIGGER trigger_update_expected_balance
    BEFORE UPDATE ON cash_drawer_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_expected_balance_on_close();

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_cash_drawer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for timestamp updates
DROP TRIGGER IF EXISTS update_cash_drawer_sessions_timestamp ON cash_drawer_sessions;
CREATE TRIGGER update_cash_drawer_sessions_timestamp
    BEFORE UPDATE ON cash_drawer_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_cash_drawer_timestamp();

-- View for active drawer sessions
CREATE OR REPLACE VIEW active_drawer_sessions AS
SELECT
    s.session_id,
    s.drawer_id,
    d.drawer_name,
    d.drawer_type,
    s.employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    s.opened_at,
    s.opening_balance,
    calculate_expected_balance(s.session_id) AS current_expected_balance,
    COALESCE(SUM(dt.amount), 0) AS total_cash_transactions,
    COALESCE(SUM(da.amount), 0) AS total_adjustments,
    COUNT(DISTINCT dt.transaction_id) AS transaction_count
FROM cash_drawer_sessions s
JOIN drawers d ON s.drawer_id = d.drawer_id
JOIN employees e ON s.employee_id = e.employee_id
LEFT JOIN cash_drawer_transactions dt ON s.session_id = dt.session_id
LEFT JOIN cash_drawer_adjustments da ON s.session_id = da.session_id
WHERE s.status = 'open'
GROUP BY s.session_id, s.drawer_id, d.drawer_name, d.drawer_type, s.employee_id, e.first_name, e.last_name, s.opened_at, s.opening_balance;

-- View for drawer session history with discrepancies
CREATE OR REPLACE VIEW drawer_session_history AS
SELECT
    s.session_id,
    s.drawer_id,
    d.drawer_name,
    d.drawer_type,
    s.employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    s.opened_at,
    s.closed_at,
    s.opening_balance,
    s.expected_balance,
    s.actual_balance,
    s.discrepancy,
    s.status,
    COUNT(DISTINCT dt.transaction_id) AS transaction_count,
    COALESCE(SUM(dt.amount), 0) AS total_cash_amount,
    COALESCE(SUM(da.amount), 0) AS total_adjustments
FROM cash_drawer_sessions s
JOIN drawers d ON s.drawer_id = d.drawer_id
JOIN employees e ON s.employee_id = e.employee_id
LEFT JOIN cash_drawer_transactions dt ON s.session_id = dt.session_id
LEFT JOIN cash_drawer_adjustments da ON s.session_id = da.session_id
GROUP BY s.session_id, s.drawer_id, d.drawer_name, d.drawer_type, s.employee_id, e.first_name, e.last_name,
         s.opened_at, s.closed_at, s.opening_balance, s.expected_balance,
         s.actual_balance, s.discrepancy, s.status
ORDER BY s.opened_at DESC;

-- Add comments for documentation
COMMENT ON TABLE cash_drawer_sessions IS 'Tracks cash drawer opening and closing for employee shifts';
COMMENT ON TABLE cash_drawer_transactions IS 'Links cash transactions to drawer sessions';
COMMENT ON TABLE cash_drawer_adjustments IS 'Records manual cash additions/removals during shifts';
COMMENT ON COLUMN cash_drawer_sessions.discrepancy IS 'Difference between actual and expected balance (positive = overage, negative = shortage)';
COMMENT ON COLUMN cash_drawer_adjustments.amount IS 'Positive for cash added to drawer, negative for cash removed';

-- Create cash_denominations table to store denomination counts for open count mode
CREATE TABLE IF NOT EXISTS cash_denominations (
    denomination_id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    denomination_type VARCHAR(20) NOT NULL, -- 'opening' or 'closing'

    -- Bill denominations (CAD)
    bill_100 INTEGER DEFAULT 0,
    bill_50 INTEGER DEFAULT 0,
    bill_20 INTEGER DEFAULT 0,
    bill_10 INTEGER DEFAULT 0,
    bill_5 INTEGER DEFAULT 0,

    -- Coin denominations (CAD)
    coin_2 INTEGER DEFAULT 0,
    coin_1 INTEGER DEFAULT 0,
    coin_0_25 INTEGER DEFAULT 0,
    coin_0_10 INTEGER DEFAULT 0,
    coin_0_05 INTEGER DEFAULT 0,

    -- Calculated total
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (
        (bill_100 * 100) +
        (bill_50 * 50) +
        (bill_20 * 20) +
        (bill_10 * 10) +
        (bill_5 * 5) +
        (coin_2 * 2) +
        (coin_1 * 1) +
        (coin_0_25 * 0.25) +
        (coin_0_10 * 0.10) +
        (coin_0_05 * 0.05)
    ) STORED,

    counted_by INTEGER NOT NULL, -- Employee who counted
    counted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,

    FOREIGN KEY (session_id) REFERENCES cash_drawer_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (counted_by) REFERENCES employees(employee_id),

    CONSTRAINT chk_denomination_type CHECK (denomination_type IN ('opening', 'closing')),
    CONSTRAINT chk_non_negative_bills CHECK (
        bill_100 >= 0 AND bill_50 >= 0 AND bill_20 >= 0 AND
        bill_10 >= 0 AND bill_5 >= 0
    ),
    CONSTRAINT chk_non_negative_coins CHECK (
        coin_2 >= 0 AND coin_1 >= 0 AND coin_0_25 >= 0 AND
        coin_0_10 >= 0 AND coin_0_05 >= 0
    )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cash_denominations_session ON cash_denominations(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_denominations_type ON cash_denominations(denomination_type);

-- Add comments for documentation
COMMENT ON TABLE cash_denominations IS 'Stores denomination counts for cash drawer sessions in open count mode';
COMMENT ON COLUMN cash_denominations.denomination_type IS 'Type of count: opening (start of shift) or closing (end of shift)';
COMMENT ON COLUMN cash_denominations.total_amount IS 'Automatically calculated total from all denominations';

-- Add blindCount preference for cash drawer counting mode
INSERT INTO user_preferences (preference_name, preference_value)
VALUES ('blindCount', 'true')
ON CONFLICT (preference_name) DO NOTHING;

-- Create discrepancy_threshold table to store acceptable discrepancy amount
CREATE TABLE IF NOT EXISTS discrepancy_threshold (
    id SERIAL PRIMARY KEY,
    threshold_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT valid_threshold CHECK (threshold_amount >= 0)
);

-- Add comment for documentation
COMMENT ON TABLE discrepancy_threshold IS 'Stores acceptable cash drawer discrepancy threshold';
COMMENT ON COLUMN discrepancy_threshold.threshold_amount IS 'Maximum acceptable discrepancy amount. If actual discrepancy exceeds this, user must recount.';

-- Insert default threshold if table is empty
INSERT INTO discrepancy_threshold (threshold_amount)
SELECT 0.00
WHERE NOT EXISTS (SELECT 1 FROM discrepancy_threshold LIMIT 1);
