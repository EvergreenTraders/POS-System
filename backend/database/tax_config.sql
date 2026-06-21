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
INSERT INTO tax_config (province_code, province_name, gst_rate, pst_rate, hst_rate)
SELECT province_code, province_name, gst_rate, pst_rate, hst_rate
FROM (VALUES
    ('AB', 'Alberta',                      5.000::DECIMAL(5,3), 0.000::DECIMAL(5,3), 0.000::DECIMAL(5,3)),
    ('BC', 'British Columbia',             5.000::DECIMAL(5,3), 7.000::DECIMAL(5,3), 0.000::DECIMAL(5,3)),
    ('MB', 'Manitoba',                     5.000::DECIMAL(5,3), 7.000::DECIMAL(5,3), 0.000::DECIMAL(5,3)),
    ('NB', 'New Brunswick',                0.000::DECIMAL(5,3), 0.000::DECIMAL(5,3), 15.000::DECIMAL(5,3)),
    ('NL', 'Newfoundland and Labrador',    0.000::DECIMAL(5,3), 0.000::DECIMAL(5,3), 15.000::DECIMAL(5,3)),
    ('NT', 'Northwest Territories',        5.000::DECIMAL(5,3), 0.000::DECIMAL(5,3), 0.000::DECIMAL(5,3)),
    ('NS', 'Nova Scotia',                  0.000::DECIMAL(5,3), 0.000::DECIMAL(5,3), 15.000::DECIMAL(5,3)),
    ('NU', 'Nunavut',                      5.000::DECIMAL(5,3), 0.000::DECIMAL(5,3), 0.000::DECIMAL(5,3)),
    ('ON', 'Ontario',                      0.000::DECIMAL(5,3), 0.000::DECIMAL(5,3), 13.000::DECIMAL(5,3)),
    ('PE', 'Prince Edward Island',         0.000::DECIMAL(5,3), 0.000::DECIMAL(5,3), 15.000::DECIMAL(5,3)),
    ('QC', 'Quebec',                       5.000::DECIMAL(5,3), 9.975::DECIMAL(5,3), 0.000::DECIMAL(5,3)),
    ('SK', 'Saskatchewan',                 5.000::DECIMAL(5,3), 6.000::DECIMAL(5,3), 0.000::DECIMAL(5,3)),
    ('YT', 'Yukon',                        5.000::DECIMAL(5,3), 0.000::DECIMAL(5,3), 0.000::DECIMAL(5,3))
) AS vals(province_code, province_name, gst_rate, pst_rate, hst_rate)
WHERE NOT EXISTS (
    SELECT 1 FROM tax_config t WHERE t.province_code = vals.province_code AND t.store_id IS NULL
);

-- Create index for faster province lookups
CREATE INDEX IF NOT EXISTS idx_tax_config_province ON tax_config(province_code);

-- Add comment for documentation
COMMENT ON TABLE tax_config IS 'Stores tax configuration for Canadian provinces and territories';
COMMENT ON COLUMN tax_config.gst_rate IS 'GST (Goods and Services Tax) rate as percentage';
COMMENT ON COLUMN tax_config.pst_rate IS 'PST (Provincial Sales Tax) rate as percentage';
COMMENT ON COLUMN tax_config.hst_rate IS 'HST (Harmonized Sales Tax) rate as percentage';

ALTER TABLE tax_config ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(store_id);
-- Replace single-column unique with composite unique per store
DO $$
BEGIN
    ALTER TABLE tax_config DROP CONSTRAINT IF EXISTS tax_config_province_code_key;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tax_config_province_store_key') THEN
        ALTER TABLE tax_config ADD CONSTRAINT tax_config_province_store_key UNIQUE (province_code, store_id);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
