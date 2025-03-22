drop table if exists quotes;
-- Create quotes table with new structure
CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(10) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    customer_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    expires_in INTEGER NOT NULL DEFAULT 30,
    days_remaining INTEGER,
    CONSTRAINT fk_quotes_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_quotes_item FOREIGN KEY (item_id) REFERENCES jewelry(item_id)
);

-- Create indexes for better performance
CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_item_id ON quotes(item_id);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);

-- Add table and column comments
COMMENT ON TABLE quotes IS 'Stores customer quotes for future transactions';
COMMENT ON COLUMN quotes.item_id IS 'Reference to item in jewelry table';
COMMENT ON COLUMN quotes.total_amount IS 'Total amount of the quote';
COMMENT ON COLUMN quotes.customer_id IS 'Reference to customer in customers table';
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
CREATE TRIGGER update_quote_days_remaining_trigger
    BEFORE INSERT OR UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_days_remaining();

-- Insert sample quotes
INSERT INTO quotes (
    item_id,
    total_amount,
    customer_id,
    created_at,
    updated_at,
    expires_in,
    days_remaining
) VALUES
-- Diamond Ring Quote
('RING001', 15000.00, 1, '2025-03-20 10:00:00', NULL, 30, 30 ),

-- Tennis Bracelet Quote
('BRAC001', 18000.00, 2, '2025-03-21 14:30:00', NULL, 30, 29 ),

-- Emerald Pendant Quote
('PEND001', 9000.00, 1, '2025-03-19 09:15:00', '2025-03-19 15:20:00', 30, 28 ),

-- Diamond Studs Quote
('EARR002', 22000.00, 1, '2025-03-18 16:45:00', NULL, 30, 0),

-- Ruby Ring Quote
('RING002', 3200.00, 2, '2025-03-22 11:00:00', NULL, 15, 15 ),

-- Gold Chain Quote
('NECK002', 3200.00, 2, '2025-03-21 13:20:00', NULL, 30, 29 ),

-- Opal Pendant Quote
('PEND002', 550.00, 1, '2025-03-20 17:00:00', NULL, 30, 28 ),

-- Pearl Earrings Quote
('EARR001', 3800.00, 2, '2025-03-19 10:30:00', '2025-03-19 14:15:00', 30, 28 ),

-- Sapphire Necklace Quote
('NECK001', 1400.00, 1, '2025-03-18 09:00:00', NULL, 15, 0),

-- Jade Bangle Quote
('BRAC002', 4200.00, 1, '2025-03-22 00:30:00', NULL, 30, 30 );
