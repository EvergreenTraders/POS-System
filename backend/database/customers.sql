-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Canada',
    
    -- Identity verification
    id_type VARCHAR(50) NOT NULL,  -- e.g., 'driver_license', 'passport', 'national_id'
    id_number VARCHAR(100) NOT NULL,
    id_expiry_date DATE,
    
    -- Physical characteristics
    gender VARCHAR(10),
    height NUMERIC(5,2),  -- in cm
    weight NUMERIC(5,2),  -- in kg
    
    -- Additional customer information
    date_of_birth DATE,
    
    -- Customer status and metadata
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    risk_level VARCHAR(20) DEFAULT 'normal' CHECK (risk_level IN ('low', 'normal', 'high')),
    notes TEXT,
    image BYTEA,
    id_image_front BYTEA,
    id_image_back BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_id_number ON customers(id_number);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_customer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp update
DROP TRIGGER IF EXISTS update_customer_timestamp ON customers;
CREATE TRIGGER update_customer_timestamp
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_timestamp();

-- Add comments for documentation
COMMENT ON TABLE customers IS 'Stores customer information including identity verification details';
COMMENT ON COLUMN customers.id_type IS 'Type of identification document provided';
COMMENT ON COLUMN customers.id_number IS 'Unique number of the identification document';
COMMENT ON COLUMN customers.risk_level IS 'Risk assessment level of the customer';
COMMENT ON COLUMN customers.status IS 'Current status of the customer account';
COMMENT ON COLUMN customers.notes IS 'Additional notes or comments about the customer';

-- Create customer_headers_preferences table for saving customer headers and preferences
CREATE TABLE IF NOT EXISTS customer_headers_preferences (
    id SERIAL PRIMARY KEY,
    
    -- Header configuration
    display_header BOOLEAN DEFAULT TRUE,
    header_style VARCHAR(50) DEFAULT 'standard',  -- standard, compact, detailed
    
    -- Customer header fields as columns (boolean values indicate display preference)
    show_id BOOLEAN DEFAULT TRUE,
    show_first_name BOOLEAN DEFAULT TRUE,
    show_last_name BOOLEAN DEFAULT TRUE,
    show_email BOOLEAN DEFAULT TRUE,
    show_phone BOOLEAN DEFAULT TRUE,
    show_address_line1 BOOLEAN DEFAULT TRUE,
    show_address_line2 BOOLEAN DEFAULT FALSE,
    show_city BOOLEAN DEFAULT TRUE,
    show_state BOOLEAN DEFAULT TRUE,
    show_postal_code BOOLEAN DEFAULT FALSE,
    show_country BOOLEAN DEFAULT FALSE,
    show_id_type BOOLEAN DEFAULT TRUE,
    show_id_number BOOLEAN DEFAULT TRUE,
    show_id_expiry BOOLEAN DEFAULT FALSE,
    show_gender BOOLEAN DEFAULT FALSE,
    show_height BOOLEAN DEFAULT FALSE,
    show_weight BOOLEAN DEFAULT FALSE,
    show_date_of_birth BOOLEAN DEFAULT FALSE,
    show_status BOOLEAN DEFAULT TRUE,
    show_risk_level BOOLEAN DEFAULT TRUE,
    show_notes BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for timestamp update for customer_headers_preferences
DROP TRIGGER IF EXISTS update_customer_preferences_timestamp ON customer_headers_preferences;
CREATE TRIGGER update_customer_preferences_timestamp
    BEFORE UPDATE ON customer_headers_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_timestamp();
    
-- Add image-related columns to the customer_headers_preferences table
ALTER TABLE customer_headers_preferences
ADD COLUMN IF NOT EXISTS show_image BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_id_image_front BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_id_image_back BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON TABLE customer_headers_preferences IS 'Stores configuration for customer headers and display preferences with one boolean column per customer field';
COMMENT ON COLUMN customer_headers_preferences.header_style IS 'Visual style of customer headers (standard, compact, detailed)';

-- ALTER commands to make id_type and id_number nullable (not mandatory fields)
ALTER TABLE customers ALTER COLUMN id_type DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN id_number DROP NOT NULL;

-- Add tax_exempt column for customers who are tax exempt
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN customers.tax_exempt IS 'Whether the customer is exempt from sales tax';