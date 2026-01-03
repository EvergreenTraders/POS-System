-- Create pawn configuration table
CREATE TABLE IF NOT EXISTS pawn_config (
    id SERIAL PRIMARY KEY,
    interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    term_days INTEGER NOT NULL DEFAULT 30,
    frequency_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_interest_rate CHECK (interest_rate >= 0 AND interest_rate <= 100),
    CONSTRAINT chk_term_days CHECK (term_days > 0),
    CONSTRAINT chk_frequency_days CHECK (frequency_days > 0)
);

-- Insert default pawn configuration
INSERT INTO pawn_config (interest_rate, term_days, frequency_days)
VALUES (0.00, 30, 30)
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
