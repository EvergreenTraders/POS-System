drop table if exists transaction_images;
drop table if exists transactions;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(20) NOT NULL UNIQUE,
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
    inventory_status VARCHAR(50) NOT NULL DEFAULT 'HOLD',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create transaction_images table
CREATE TABLE IF NOT EXISTS transaction_images (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id),
    image_url TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_images_transaction ON transaction_images(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_images_primary ON transaction_images(transaction_id) WHERE is_primary = true;

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'Stores customer transactions including payment details, status, and references to items';
COMMENT ON COLUMN transactions.transaction_id IS 'Unique transaction ID in format TSDXXXXXX where XXXXXX is a 6-digit number';
COMMENT ON TABLE transaction_images IS 'Stores images associated with transactions';
COMMENT ON COLUMN transaction_images.is_primary IS 'Flag indicating if this is the primary image for the transaction';

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
