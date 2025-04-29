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

-- Insert dummy data with Canadian names and details
INSERT INTO customers (
    first_name, last_name, email, phone, 
    address_line1, address_line2, city, state, postal_code, country,
    id_type, id_number, id_expiry_date,
    gender, height, weight,
    date_of_birth, status, risk_level, notes,
    image, id_image_front, id_image_back
) VALUES
-- Customer 1
(
    'Liam', 'Tremblay', 'liam.tremblay@example.com', '(514) 555-1234',
    '123 Rue Sainte-Catherine', 'Apt 502', 'Montreal', 'Quebec', 'H2X 1K4', 'Canada',
    'driver_license', 'QC1234567890', '2026-05-15',
    'male', 178.5, 75.2,
    '1985-08-12', 'active', 'normal', 'Regular customer since 2020. Prefers gold coins.',
    '\x89504e470d0a1a0a', '\x89504e470d0a1a0a', '\x89504e470d0a1a0a' -- Placeholder binary data
),
-- Customer 2
(
    'Olivia', 'Roy', 'olivia.roy@example.com', '(416) 555-2345',
    '456 Queen Street West', NULL, 'Toronto', 'Ontario', 'M5V 2A9', 'Canada',
    'passport', 'GA123456', '2028-10-22',
    'female', 165.3, 61.8,
    '1990-03-25', 'active', 'low', 'Has a collection of silver bullion.',
    '\x89504e470d0a1a0b', '\x89504e470d0a1a0b', '\x89504e470d0a1a0b' -- Placeholder binary data
),
-- Customer 3
(
    'Noah', 'Bouchard', 'noah.bouchard@example.com', '(604) 555-3456',
    '789 Robson Street', 'Suite 301', 'Vancouver', 'British Columbia', 'V6Z 3B7', 'Canada',
    'national_id', 'BC9876543210', '2025-12-01',
    'male', 182.7, 84.5,
    '1978-11-03', 'inactive', 'normal', 'Interested in vintage coins and jewelry.',
    '\x89504e470d0a1a0c', '\x89504e470d0a1a0c', '\x89504e470d0a1a0c' -- Placeholder binary data
),
-- Customer 4
(
    'Emma', 'Gagnon', 'emma.gagnon@example.com', '(780) 555-4567',
    '101 Jasper Avenue', NULL, 'Edmonton', 'Alberta', 'T5J 1S2', 'Canada',
    'driver_license', 'AB5678901234', '2027-04-18',
    'female', 170.2, 58.6,
    '1992-05-17', 'active', 'normal', 'Repeat customer for jewelry appraisals.',
    '\x89504e470d0a1a0d', '\x89504e470d0a1a0d', '\x89504e470d0a1a0d' -- Placeholder binary data
),
-- Customer 5
(
    'William', 'Lavoie', 'william.lavoie@example.com', '(902) 555-5678',
    '234 Barrington Street', 'Unit 5', 'Halifax', 'Nova Scotia', 'B3J 1Y9', 'Canada',
    'passport', 'HJ987654', '2027-08-30',
    'male', 175.8, 80.3,
    '1975-07-21', 'active', 'high', 'Prefers to be contacted by phone only.',
    '\x89504e470d0a1a0e', '\x89504e470d0a1a0e', '\x89504e470d0a1a0e' -- Placeholder binary data
),
-- Customer 6
(
    'Charlotte', 'Bergeron', 'charlotte.bergeron@example.com', '(613) 555-6789',
    '345 Bank Street', 'Apt 802', 'Ottawa', 'Ontario', 'K2P 1X7', 'Canada',
    'driver_license', 'ON6543219876', '2025-09-12',
    'female', 167.4, 59.1,
    '1988-01-30', 'blocked', 'high', 'Account blocked due to suspicious transaction attempt.',
    '\x89504e470d0a1a0f', '\x89504e470d0a1a0f', '\x89504e470d0a1a0f' -- Placeholder binary data
),
-- Customer 7
(
    'Benjamin', 'Caron', 'benjamin.caron@example.com', '(306) 555-7890',
    '456 2nd Avenue North', NULL, 'Saskatoon', 'Saskatchewan', 'S7K 2C3', 'Canada',
    'national_id', 'SK1357924680', '2024-11-05',
    'male', 180.0, 76.8,
    '1983-09-14', 'active', 'low', 'Collector of rare Canadian coins.',
    '\x89504e470d0a1a10', '\x89504e470d0a1a10', '\x89504e470d0a1a10' -- Placeholder binary data
),
-- Customer 8
(
    'Sophia', 'Morin', 'sophia.morin@example.com', '(204) 555-8901',
    '567 Portage Avenue', 'Suite 405', 'Winnipeg', 'Manitoba', 'R3B 2G2', 'Canada',
    'driver_license', 'MB2468013579', '2026-06-27',
    'female', 163.7, 57.2,
    '1995-12-08', 'active', 'normal', 'Recently moved from Quebec. Updated address in March 2025.',
    '\x89504e470d0a1a11', '\x89504e470d0a1a11', '\x89504e470d0a1a11' -- Placeholder binary data
),
-- Customer 9
(
    'Lucas', 'Fortin', 'lucas.fortin@example.com', '(709) 555-9012',
    '678 Water Street', NULL, 'St. John', 'Newfoundland and Labrador', 'A1C 1B5', 'Canada',
    'passport', 'KL654321', '2029-01-15',
    'male', 176.2, 71.5,
    '1980-04-22', 'active', 'normal', 'Interested in gold investment pieces.',
    '\x89504e470d0a1a12', '\x89504e470d0a1a12', '\x89504e470d0a1a12' -- Placeholder binary data
),
-- Customer 10
(
    'Amelia', 'Côté', 'amelia.cote@example.com', '(250) 555-0123',
    '789 Government Street', 'Unit 3B', 'Victoria', 'British Columbia', 'V8W 1W9', 'Canada',
    'driver_license', 'BC1122334455', '2028-03-09',
    'female', 168.9, 62.4,
    '1991-06-11', 'active', 'low', 'Regular customer who prefers silver products.',
    '\x89504e470d0a1a13', '\x89504e470d0a1a13', '\x89504e470d0a1a13' -- Placeholder binary data
),
-- Customer 11
(
    'Jack', 'Lefebvre', 'jack.lefebvre@example.com', '(506) 555-1122',
    '890 King Street', NULL, 'Fredericton', 'New Brunswick', 'E3B 1E3', 'Canada',
    'national_id', 'NB9988776655', '2025-02-14',
    'male', 173.6, 78.9,
    '1972-10-18', 'inactive', 'normal', 'Has not visited since January 2025.',
    '\x89504e470d0a1a14', '\x89504e470d0a1a14', '\x89504e470d0a1a14' -- Placeholder binary data
),
-- Customer 12
(
    'Mia', 'Pelletier', 'mia.pelletier@example.com', '(867) 555-2233',
    '901 Main Street', 'Apt 7C', 'Whitehorse', 'Yukon', 'Y1A 5X7', 'Canada',
    'driver_license', 'YT5544332211', '2027-11-30',
    'female', 161.5, 55.8,
    '1987-02-15', 'active', 'normal', 'Interested in jewelry with northern designs.',
    '\x89504e470d0a1a15', '\x89504e470d0a1a15', '\x89504e470d0a1a15' -- Placeholder binary data
);
