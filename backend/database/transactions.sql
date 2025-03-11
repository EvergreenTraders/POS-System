drop table transactions;
-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    transaction_type VARCHAR(50) NOT NULL,
    estimated_value DECIMAL(10,2) NOT NULL,
    metal_purity VARCHAR(50),
    weight DECIMAL(10,3),
    category VARCHAR(20),
    metal_type VARCHAR(50),
    primary_gem VARCHAR(100),
    secondary_gem VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'Stores customer transactions including payment details, status, and references to items';
COMMENT ON COLUMN transactions.status IS 'Current status of the transaction: pending, completed, cancelled, or failed';

-- Create trigger function to update transactions.updated_at
CREATE OR REPLACE FUNCTION update_transactions_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_transactions_timestamp
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transactions_timestamp();
