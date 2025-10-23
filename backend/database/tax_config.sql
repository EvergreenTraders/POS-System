-- Create tax_config table for storing provincial tax rates
CREATE TABLE IF NOT EXISTS tax_config (
    id SERIAL PRIMARY KEY,
    province_code VARCHAR(2) NOT NULL UNIQUE,
    province_name VARCHAR(100) NOT NULL,
    gst_rate DECIMAL(5,3) DEFAULT 0,
    pst_rate DECIMAL(5,3) DEFAULT 0,
    hst_rate DECIMAL(5,3) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger function to update timestamp
CREATE OR REPLACE FUNCTION update_tax_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp update
DROP TRIGGER IF EXISTS update_tax_config_timestamp ON tax_config;
CREATE TRIGGER update_tax_config_timestamp
    BEFORE UPDATE ON tax_config
    FOR EACH ROW
    EXECUTE FUNCTION update_tax_config_timestamp();

-- Insert default Canadian provincial tax rates
INSERT INTO tax_config (province_code, province_name, gst_rate, pst_rate, hst_rate) VALUES
    ('AB', 'Alberta', 5.000, 0.000, 0.000),
    ('BC', 'British Columbia', 5.000, 7.000, 0.000),
    ('MB', 'Manitoba', 5.000, 7.000, 0.000),
    ('NB', 'New Brunswick', 0.000, 0.000, 15.000),
    ('NL', 'Newfoundland and Labrador', 0.000, 0.000, 15.000),
    ('NT', 'Northwest Territories', 5.000, 0.000, 0.000),
    ('NS', 'Nova Scotia', 0.000, 0.000, 15.000),
    ('NU', 'Nunavut', 5.000, 0.000, 0.000),
    ('ON', 'Ontario', 0.000, 0.000, 13.000),
    ('PE', 'Prince Edward Island', 0.000, 0.000, 15.000),
    ('QC', 'Quebec', 5.000, 9.975, 0.000),
    ('SK', 'Saskatchewan', 5.000, 6.000, 0.000),
    ('YT', 'Yukon', 5.000, 0.000, 0.000)
ON CONFLICT (province_code) DO NOTHING;

-- Create index for faster province lookups
CREATE INDEX IF NOT EXISTS idx_tax_config_province ON tax_config(province_code);

-- Add comment for documentation
COMMENT ON TABLE tax_config IS 'Stores tax configuration for Canadian provinces and territories';
COMMENT ON COLUMN tax_config.gst_rate IS 'GST (Goods and Services Tax) rate as percentage';
COMMENT ON COLUMN tax_config.pst_rate IS 'PST (Provincial Sales Tax) rate as percentage';
COMMENT ON COLUMN tax_config.hst_rate IS 'HST (Harmonized Sales Tax) rate as percentage';
