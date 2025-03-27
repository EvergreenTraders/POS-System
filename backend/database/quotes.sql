-- Create quotes table with new structure
CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(10) NOT NULL,
    customer_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    expires_in INTEGER NOT NULL DEFAULT 30,
    days_remaining INTEGER,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('buy', 'pawn', 'retail')),
    CONSTRAINT fk_quotes_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_quotes_item FOREIGN KEY (item_id) REFERENCES jewelry(item_id),
    CONSTRAINT fk_quotes_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- Remove total_amount column from existing table
ALTER TABLE quotes DROP COLUMN IF EXISTS total_amount;

-- Create indexes for better performance
CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_item_id ON quotes(item_id);
CREATE INDEX idx_quotes_employee_id ON quotes(employee_id);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);

-- Add comments
COMMENT ON TABLE quotes IS 'Stores customer quotes for future transactions';
COMMENT ON COLUMN quotes.item_id IS 'Reference to item in jewelry table';
COMMENT ON COLUMN quotes.customer_id IS 'Reference to customer in customers table';
COMMENT ON COLUMN quotes.employee_id IS 'Reference to employee who created the quote';
COMMENT ON COLUMN quotes.expires_in IS 'Number of days until the quote expires';
COMMENT ON COLUMN quotes.days_remaining IS 'Number of days remaining before the quote expires';
COMMENT ON COLUMN quotes.transaction_type IS 'Type of transaction, either buy or pawn or retail';

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
CREATE TRIGGER update_quote_days_remaining_trigger
    BEFORE INSERT OR UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_days_remaining();

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

-- Insert sample quotes
INSERT INTO quotes (
    item_id,
    customer_id,
    employee_id,
    created_at,
    updated_at,
    expires_in,
    days_remaining,
    transaction_type
) VALUES
-- Diamond Ring Quote
('RING001', 1, 1, '2025-03-20 10:00:00', NULL, 30, 30, 'buy' ),

-- Tennis Bracelet Quote
('BRAC001', 2, 2, '2025-03-21 14:30:00', NULL, 30, 29, 'pawn' ),

-- Emerald Pendant Quote
('PEND001', 1, 1, '2025-03-19 09:15:00', '2025-03-19 15:20:00', 30, 28, 'buy' ),

-- Diamond Studs Quote
('EARR002', 1, 2, '2025-03-18 16:45:00', NULL, 30, 0, 'retail' ),

-- Ruby Ring Quote
('RING002', 2, 1, '2025-03-22 11:00:00', NULL, 15, 15, 'buy' ),

-- Gold Chain Quote
('NECK002', 2, 2, '2025-03-21 13:20:00', NULL, 30, 29, 'pawn' ),

-- Opal Pendant Quote
('PEND002', 1, 1, '2025-03-20 17:00:00', NULL, 30, 28, 'buy' ),

-- Pearl Earrings Quote
('EARR001', 2, 2, '2025-03-19 10:30:00', '2025-03-19 14:15:00', 30, 28, 'pawn' ),

-- Sapphire Necklace Quote
('NECK001', 1, 1, '2025-03-18 09:00:00', NULL, 15, 0, 'buy' ),

-- Jade Bangle Quote
('BRAC002', 1, 2, '2025-03-22 00:30:00', NULL, 30, 30, 'retail' );
