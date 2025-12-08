-- Cash Drawer Management System
-- Tracks cash drawer sessions for employees, including opening/closing balance verification

-- Create cash_drawer_sessions table
CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
    session_id SERIAL PRIMARY KEY,
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
    s.employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    s.opened_at,
    s.opening_balance,
    calculate_expected_balance(s.session_id) AS current_expected_balance,
    COALESCE(SUM(dt.amount), 0) AS total_cash_transactions,
    COALESCE(SUM(da.amount), 0) AS total_adjustments,
    COUNT(DISTINCT dt.transaction_id) AS transaction_count
FROM cash_drawer_sessions s
JOIN employees e ON s.employee_id = e.employee_id
LEFT JOIN cash_drawer_transactions dt ON s.session_id = dt.session_id
LEFT JOIN cash_drawer_adjustments da ON s.session_id = da.session_id
WHERE s.status = 'open'
GROUP BY s.session_id, s.employee_id, e.first_name, e.last_name, s.opened_at, s.opening_balance;

-- View for drawer session history with discrepancies
CREATE OR REPLACE VIEW drawer_session_history AS
SELECT
    s.session_id,
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
JOIN employees e ON s.employee_id = e.employee_id
LEFT JOIN cash_drawer_transactions dt ON s.session_id = dt.session_id
LEFT JOIN cash_drawer_adjustments da ON s.session_id = da.session_id
GROUP BY s.session_id, s.employee_id, e.first_name, e.last_name,
         s.opened_at, s.closed_at, s.opening_balance, s.expected_balance,
         s.actual_balance, s.discrepancy, s.status
ORDER BY s.opened_at DESC;

-- Add comments for documentation
COMMENT ON TABLE cash_drawer_sessions IS 'Tracks cash drawer opening and closing for employee shifts';
COMMENT ON TABLE cash_drawer_transactions IS 'Links cash transactions to drawer sessions';
COMMENT ON TABLE cash_drawer_adjustments IS 'Records manual cash additions/removals during shifts';
COMMENT ON COLUMN cash_drawer_sessions.discrepancy IS 'Difference between actual and expected balance (positive = overage, negative = shortage)';
COMMENT ON COLUMN cash_drawer_adjustments.amount IS 'Positive for cash added to drawer, negative for cash removed';
