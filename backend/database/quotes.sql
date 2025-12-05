-- Drop existing quotes table
-- drop table if exists quotes cascade;

-- Create quotes table with new structure
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    quote_id VARCHAR(20) NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    expires_in INTEGER NOT NULL DEFAULT 30,
    days_remaining INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_quotes_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_quotes_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- Create quote_items table to link quotes with items
CREATE TABLE IF NOT EXISTS quote_items (
    id SERIAL PRIMARY KEY,
    quote_id VARCHAR(20) NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    transaction_type_id INTEGER NOT NULL,
    item_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_quote_item UNIQUE (item_id),
    FOREIGN KEY (quote_id) REFERENCES quotes(quote_id),
    FOREIGN KEY (item_id) REFERENCES jewelry(item_id),
    FOREIGN KEY (transaction_type_id) REFERENCES transaction_type(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotes_quote_id ON quotes(quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_employee_id ON quotes(employee_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_item_id ON quote_items(item_id);

-- Add comments
COMMENT ON TABLE quotes IS 'Stores customer quotes for future transactions';
COMMENT ON COLUMN quotes.customer_id IS 'Reference to customer in customers table';
COMMENT ON COLUMN quotes.employee_id IS 'Reference to employee who created the quote';
COMMENT ON COLUMN quotes.expires_in IS 'Number of days until the quote expires';
COMMENT ON COLUMN quotes.days_remaining IS 'Number of days remaining before the quote expires';

-- Create function to update days_remaining
CREATE OR REPLACE FUNCTION update_quote_days_remaining()
RETURNS TRIGGER AS $$
BEGIN
    NEW.days_remaining := 
        CASE 
            WHEN NEW.created_at + (NEW.expires_in || ' days')::INTERVAL > CURRENT_TIMESTAMP 
            THEN CEIL(EXTRACT(EPOCH FROM (NEW.created_at + (NEW.expires_in || ' days')::INTERVAL - CURRENT_TIMESTAMP)) / 86400)::INTEGER
            ELSE 0
        END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update days_remaining
DROP TRIGGER IF EXISTS update_quote_days_remaining_trigger ON quotes;
CREATE TRIGGER update_quote_days_remaining_trigger
    BEFORE INSERT OR UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_days_remaining();

-- Create trigger to update updated_at timestamp for quote_items
DROP TRIGGER IF EXISTS update_quote_items_timestamp ON quote_items;
CREATE TRIGGER update_quote_items_timestamp
    BEFORE UPDATE ON quote_items
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Create function to update all quotes days remaining
CREATE OR REPLACE FUNCTION update_quotes_days_remaining()
RETURNS void AS $$
BEGIN
    UPDATE quotes
    SET days_remaining = 
        CASE 
            WHEN created_at + (expires_in || ' days')::INTERVAL > CURRENT_TIMESTAMP 
            THEN CEIL(EXTRACT(EPOCH FROM (created_at + (expires_in || ' days')::INTERVAL - CURRENT_TIMESTAMP)) / 86400)::INTEGER
            ELSE 0
        END;
END;
$$ LANGUAGE plpgsql;

-- -- Insert sample quotes
-- INSERT INTO quotes (
--     item_id,
--     customer_id,
--     employee_id,
--     created_at,
--     updated_at,
--     expires_in,
--     days_remaining,
--     transaction_type
-- ) VALUES
-- -- Diamond Ring Quote
-- ('RING001', 1, 1, '2025-03-20 10:00:00', NULL, 30, 30, 'buy' ),

-- -- Tennis Bracelet Quote
-- ('BRAC001', 2, 2, '2025-03-21 14:30:00', NULL, 30, 29, 'pawn' ),

-- -- Emerald Pendant Quote
-- ('PEND001', 1, 1, '2025-03-19 09:15:00', '2025-03-19 15:20:00', 30, 28, 'buy' ),

-- -- Diamond Studs Quote
-- ('EARR002', 1, 2, '2025-03-18 16:45:00', NULL, 30, 0, 'retail' ),

-- -- Ruby Ring Quote
-- ('RING002', 2, 1, '2025-03-22 11:00:00', NULL, 15, 15, 'buy' ),

-- -- Gold Chain Quote
-- ('NECK002', 2, 2, '2025-03-21 13:20:00', NULL, 30, 29, 'pawn' ),

-- -- Opal Pendant Quote
-- ('PEND002', 1, 1, '2025-03-20 17:00:00', NULL, 30, 28, 'buy' ),

-- -- Pearl Earrings Quote
-- ('EARR001', 2, 2, '2025-03-19 10:30:00', '2025-03-19 14:15:00', 30, 28, 'pawn' ),

-- -- Sapphire Necklace Quote
-- ('NECK001', 1, 1, '2025-03-18 09:00:00', NULL, 15, 0, 'buy' ),

-- -- Jade Bangle Quote
-- ('BRAC002', 1, 2, '2025-03-22 00:30:00', NULL, 30, 30, 'retail' );
