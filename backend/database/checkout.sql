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
    expires_in INTEGER NOT NULL DEFAULT 30,
    days_remaining INTEGER,
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
COMMENT ON COLUMN quotes.expires_in IS 'Number of days until the quote expires';
COMMENT ON COLUMN quotes.days_remaining IS 'Number of days remaining before the quote expires';

-- Create function to update days_remaining
CREATE OR REPLACE FUNCTION update_quotes_days_remaining()
RETURNS void AS $$
BEGIN
    -- Update days_remaining for all active quotes based on their original expires_in
    UPDATE quotes 
    SET 
        days_remaining = expires_in - EXTRACT(DAY FROM (CURRENT_TIMESTAMP - created_at))::INTEGER,
        status = CASE 
            WHEN expires_in - EXTRACT(DAY FROM (CURRENT_TIMESTAMP - created_at))::INTEGER <= 0 THEN 'expired'
            ELSE status 
        END
    WHERE status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to set initial expires_in from quote_expiration config
CREATE OR REPLACE FUNCTION set_quote_expiration()
RETURNS trigger AS $$
BEGIN
    -- Get the expiration days from quote_expiration table only for new quotes
    SELECT days INTO NEW.expires_in
    FROM quote_expiration
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;

    -- Calculate initial days_remaining
    NEW.days_remaining := NEW.expires_in;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set expires_in on quote creation
CREATE TRIGGER set_quote_expiration_trigger
    BEFORE INSERT ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION set_quote_expiration();

-- Create trigger to update days_remaining on every update
CREATE OR REPLACE FUNCTION update_days_remaining()
RETURNS trigger AS $$
BEGIN
    -- Keep the original expires_in value
    NEW.expires_in := OLD.expires_in;
    
    -- Calculate days_remaining based on the original expires_in
    NEW.days_remaining := OLD.expires_in - EXTRACT(DAY FROM (CURRENT_TIMESTAMP - OLD.created_at))::INTEGER;
    
    -- Auto-expire quotes when days_remaining reaches 0
    IF NEW.days_remaining <= 0 AND NEW.status = 'pending' THEN
        NEW.status := 'expired';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quote_days_remaining
    BEFORE UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_days_remaining();