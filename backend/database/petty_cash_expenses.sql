-- Create petty_cash_expenses table for managing petty cash expense categories
-- Each expense category defines how petty cash payouts should be recorded in accounting

CREATE TABLE IF NOT EXISTS petty_cash_expenses (
    expense_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    accounting_code VARCHAR(50) NOT NULL,
    includes_sales_tax BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    
    -- Ensure unique expense names
    CONSTRAINT unique_expense_name UNIQUE (name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_name ON petty_cash_expenses(name);
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_accounting_code ON petty_cash_expenses(accounting_code);

-- Add comments for documentation
COMMENT ON TABLE petty_cash_expenses IS 'Stores petty cash expense categories for tracking and accounting purposes';
COMMENT ON COLUMN petty_cash_expenses.name IS 'Name of the expense category (e.g., "Staff Rewards", "Store Supplies")';
COMMENT ON COLUMN petty_cash_expenses.accounting_code IS 'Accounting code to post expenses to (e.g., "5001")';
COMMENT ON COLUMN petty_cash_expenses.includes_sales_tax IS 'If true, payouts will be split between expense and tax based on configured tax rate';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_petty_cash_expenses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_petty_cash_expenses_timestamp ON petty_cash_expenses;
CREATE TRIGGER update_petty_cash_expenses_timestamp
    BEFORE UPDATE ON petty_cash_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_petty_cash_expenses_timestamp();
