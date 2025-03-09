-- Create transaction_items table first since transactions will reference it
CREATE TABLE IF NOT EXISTS transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(50) NOT NULL,
    estimated_value DECIMAL(10,2) NOT NULL,
    metal_purity VARCHAR(50),
    weight DECIMAL(10,3),
    category VARCHAR(100),
    metal_type VARCHAR(50),
    primary_gem VARCHAR(50),
    secondary_gem VARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('buy', 'sell', 'pawn'))
);

-- Create transactions table with items reference
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    items_id INTEGER[] NOT NULL, -- Array of transaction_items IDs
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_details JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT valid_payment_method CHECK (payment_method IN ('cash', 'card')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'cancelled', 'failed'))
);

-- Create a junction table to maintain referential integrity
CREATE TABLE IF NOT EXISTS transaction_item_mappings (
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES transaction_items(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, item_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_items_array ON transactions USING GIN(items_id);
CREATE INDEX IF NOT EXISTS idx_transaction_item_mappings ON transaction_item_mappings(transaction_id, item_id);

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'Stores customer transactions including payment details, status, and references to items';
COMMENT ON TABLE transaction_items IS 'Stores individual items involved in transactions';
COMMENT ON TABLE transaction_item_mappings IS 'Maps transactions to their items maintaining referential integrity';
COMMENT ON COLUMN transactions.items_id IS 'Array of transaction_items IDs associated with this transaction';
COMMENT ON COLUMN transactions.payment_details IS 'JSON object containing payment-specific details (e.g., cash amount or card details)';
COMMENT ON COLUMN transactions.status IS 'Current status of the transaction: pending, completed, cancelled, or failed';
COMMENT ON COLUMN transaction_items.transaction_type IS 'Type of transaction: buy, sell, or pawn';

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

-- Create function to ensure items_id array matches junction table
CREATE OR REPLACE FUNCTION validate_transaction_items()
RETURNS trigger AS $$
BEGIN
    -- Ensure all items in items_id exist in transaction_item_mappings
    IF NOT EXISTS (
        SELECT 1
        FROM unnest(NEW.items_id) item_id
        LEFT JOIN transaction_item_mappings tim ON tim.item_id = item_id AND tim.transaction_id = NEW.id
        WHERE tim.transaction_id IS NULL
    ) THEN
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'All items in items_id must have corresponding entries in transaction_item_mappings';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate items_id array
CREATE TRIGGER validate_transaction_items
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION validate_transaction_items();
