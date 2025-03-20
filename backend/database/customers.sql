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
    id_issuing_authority VARCHAR(100),
    id_scan_path VARCHAR(255),  -- Path to stored ID scan
    
    -- Additional customer information
    date_of_birth DATE,
    
    -- Customer status and metadata
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    risk_level VARCHAR(20) DEFAULT 'normal' CHECK (risk_level IN ('low', 'normal', 'high')),
    notes TEXT,
    last_visit_date TIMESTAMP,
    total_transactions INTEGER DEFAULT 0,
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
