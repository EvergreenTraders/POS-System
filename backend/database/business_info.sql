-- Business Information Table
-- Stores business configuration including logo

CREATE TABLE IF NOT EXISTS business_info (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL DEFAULT 'Evergreen POS',
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    currency VARCHAR(10) DEFAULT 'USD',
    timezone VARCHAR(100) DEFAULT 'UTC',
    logo BYTEA,
    logo_filename VARCHAR(255),
    logo_mimetype VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default business info row
INSERT INTO business_info (business_name, email, phone, address, currency, timezone)
VALUES ('Evergreen POS', '', '', '', 'USD', 'UTC')
ON CONFLICT DO NOTHING;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_info_updated_at ON business_info;
CREATE TRIGGER business_info_updated_at
    BEFORE UPDATE ON business_info
    FOR EACH ROW
    EXECUTE FUNCTION update_business_info_updated_at();

-- ALTER command to add address column (if table already exists without it)
-- Uncomment the line below if you need to add the address column to an existing table
-- ALTER TABLE business_info ADD COLUMN IF NOT EXISTS address TEXT;


-- Currency Types Table
-- Stores supported currencies for the company/store
CREATE TABLE IF NOT EXISTS currency_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,          -- e.g. CAD
    description VARCHAR(255) NOT NULL,         -- e.g. Canadian Dollar
    is_default BOOLEAN NOT NULL DEFAULT FALSE, -- only one row should be TRUE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure only one default currency (or zero) by using a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_currency_types_default_true
ON currency_types (is_default)
WHERE is_default = TRUE;

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION update_currency_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS currency_types_updated_at ON currency_types;
CREATE TRIGGER currency_types_updated_at
    BEFORE UPDATE ON currency_types
    FOR EACH ROW
    EXECUTE FUNCTION update_currency_types_updated_at();

-- Insert default CAD currency if table is empty
INSERT INTO currency_types (code, description, is_default)
SELECT 'CAD', 'Canadian Dollar', TRUE
WHERE NOT EXISTS (SELECT 1 FROM currency_types);