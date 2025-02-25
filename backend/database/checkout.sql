-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    items JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'expired', 'cancelled'))
);

-- Create index for faster status lookups
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- Create index for faster date range queries
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);

-- Add comments for documentation
COMMENT ON TABLE quotes IS 'Stores customer quotes for future transactions';
COMMENT ON COLUMN quotes.items IS 'JSON array of items in the quote including their details and prices';
COMMENT ON COLUMN quotes.total_amount IS 'Total amount of the quote';
COMMENT ON COLUMN quotes.status IS 'Current status of the quote: pending, completed, expired, or cancelled';