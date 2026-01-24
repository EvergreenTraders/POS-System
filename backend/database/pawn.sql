-- Create pawn configuration table
CREATE TABLE IF NOT EXISTS pawn_config (
    id SERIAL PRIMARY KEY,
    interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    term_days INTEGER NOT NULL DEFAULT 30,
    frequency_days INTEGER NOT NULL DEFAULT 30,
    forfeiture_mode VARCHAR(20) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_interest_rate CHECK (interest_rate >= 0 AND interest_rate <= 100),
    CONSTRAINT chk_term_days CHECK (term_days > 0),
    CONSTRAINT chk_frequency_days CHECK (frequency_days > 0),
    CONSTRAINT chk_forfeiture_mode CHECK (forfeiture_mode IN ('manual', 'automatic'))
);

-- Insert default pawn configuration
INSERT INTO pawn_config (interest_rate, term_days, frequency_days, forfeiture_mode)
VALUES (0.00, 30, 30, 'manual')
ON CONFLICT DO NOTHING;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_pawn_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_pawn_config_timestamp ON pawn_config;
CREATE TRIGGER update_pawn_config_timestamp
    BEFORE UPDATE ON pawn_config
    FOR EACH ROW
    EXECUTE FUNCTION update_pawn_config_timestamp();

-- Add comments
COMMENT ON TABLE pawn_config IS 'Stores pawn transaction configuration including interest rate, term, and payment frequency';
COMMENT ON COLUMN pawn_config.interest_rate IS 'Interest rate as a percentage (0.00 to 100.00)';
COMMENT ON COLUMN pawn_config.term_days IS 'Default pawn term in days';
COMMENT ON COLUMN pawn_config.frequency_days IS 'Payment frequency in days';
COMMENT ON COLUMN pawn_config.forfeiture_mode IS 'Forfeiture mode: manual (FORFEITED status) or automatic (ACTIVE status)';

-- Create pawn_history table for tracking extensions, redemptions, and forfeitures
CREATE TABLE IF NOT EXISTS pawn_history (
    id SERIAL PRIMARY KEY,
    pawn_ticket_id VARCHAR(50) NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    action_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    transaction_id VARCHAR(50),
    principal_amount DECIMAL(10,2),
    interest_paid DECIMAL(10,2),
    fee_paid DECIMAL(10,2),
    total_paid DECIMAL(10,2),
    previous_due_date DATE,
    new_due_date DATE,
    extension_days INTEGER,
    performed_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_action_type CHECK (
        action_type IN ('CREATED', 'EXTEND', 'REDEEM', 'FORFEIT', 'PARTIAL_REDEEM')
    ),
    FOREIGN KEY (performed_by) REFERENCES employees(employee_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pawn_history_ticket ON pawn_history(pawn_ticket_id);
CREATE INDEX IF NOT EXISTS idx_pawn_history_action_date ON pawn_history(action_date);
CREATE INDEX IF NOT EXISTS idx_pawn_history_action_type ON pawn_history(action_type);

-- Add comments for pawn_history table
COMMENT ON TABLE pawn_history IS 'Tracks all pawn ticket actions including creation, extensions, redemptions, and forfeitures';
COMMENT ON COLUMN pawn_history.pawn_ticket_id IS 'Reference to the pawn ticket';
COMMENT ON COLUMN pawn_history.action_type IS 'Type of action: CREATED, EXTEND, REDEEM, FORFEIT, PARTIAL_REDEEM';
COMMENT ON COLUMN pawn_history.principal_amount IS 'Principal amount of the pawn at the time of action';
COMMENT ON COLUMN pawn_history.interest_paid IS 'Interest amount paid (for extensions/redemptions)';
COMMENT ON COLUMN pawn_history.fee_paid IS 'Fee amount paid (for extensions/redemptions)';
COMMENT ON COLUMN pawn_history.total_paid IS 'Total amount paid (interest + fee)';
COMMENT ON COLUMN pawn_history.previous_due_date IS 'Due date before the action';
COMMENT ON COLUMN pawn_history.new_due_date IS 'New due date after the action (for extensions)';
COMMENT ON COLUMN pawn_history.extension_days IS 'Number of days the loan was extended by';
