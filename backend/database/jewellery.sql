-- Drop existing tables if they exist
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS jewellery_items CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS appraisals CASCADE;
DROP TABLE IF EXISTS pawns CASCADE;

-- Customers table
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    id_type VARCHAR(50),
    id_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jewellery items table
CREATE TABLE jewellery_items (
    item_id SERIAL PRIMARY KEY,
    type VARCHAR(50),
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(100),
    description TEXT,
    metal_type VARCHAR(50),
    purity VARCHAR(20),  -- For gold karat or silver purity
    weight_oz NUMERIC(10,3),
    stone_type VARCHAR(50),
    stone_weight NUMERIC(10,3),
    condition_grade VARCHAR(20),
    acquisition_date DATE,
    acquisition_price NUMERIC(10,2),
    selling_price NUMERIC(10,2),
    status VARCHAR(20), -- 'in_stock', 'pawned', 'sold'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appraisals table
CREATE TABLE appraisals (
    appraisal_id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES jewellery_items(item_id),
    appraiser_name VARCHAR(100),
    appraisal_date DATE,
    market_value NUMERIC(10,2),
    wholesale_value NUMERIC(10,2),
    retail_value NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pawn transactions table
CREATE TABLE pawns (
    pawn_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    item_id INTEGER REFERENCES jewellery_items(item_id),
    pawn_date DATE,
    loan_amount NUMERIC(10,2),
    interest_rate NUMERIC(5,2),
    loan_term_days INTEGER,
    due_date DATE,
    status VARCHAR(20), -- 'active', 'redeemed', 'defaulted', 'extended'
    redemption_date DATE,
    redemption_amount NUMERIC(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    item_id INTEGER REFERENCES jewellery_items(item_id),
    pawn_id INTEGER REFERENCES pawns(pawn_id),
    transaction_type VARCHAR(20), -- 'purchase', 'sale', 'pawn', 'redemption'
    amount NUMERIC(10,2),
    payment_method VARCHAR(50),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_jewellery_sku ON jewellery_items(sku);
CREATE INDEX idx_customer_email ON customers(email);
CREATE INDEX idx_pawn_status ON pawns(status);
CREATE INDEX idx_transaction_date ON transactions(transaction_date);

-- Sample data insertion
INSERT INTO customers (first_name, last_name, email, phone, id_type, id_number)
VALUES 
('John', 'Doe', 'john@example.com', '555-0123', 'Driver License', 'DL123456'),
('Jane', 'Smith', 'jane@example.com', '555-0124', 'Passport', 'PS789012');

INSERT INTO jewellery_items (type, sku, name, description, metal_type, purity, weight_oz, stone_type, stone_weight, condition_grade, acquisition_price, selling_price, status)
VALUES 
('Ring', 'RNG001', 'Diamond Solitaire Ring', '1 carat diamond ring', 'Gold', '18K', 0.25, 'Diamond', 1.0, 'Excellent', 1000.00, 2500.00, 'in_stock'),
('Necklace', 'NCK001', 'Gold Chain', '24-inch gold chain', 'Gold', '22K', 1.5, NULL, NULL, 'Good', 800.00, 1600.00, 'in_stock');

INSERT INTO appraisals (item_id, appraiser_name, appraisal_date, market_value, wholesale_value, retail_value, notes)
VALUES 
(1, 'James Wilson', '2024-01-15', 2000.00, 1500.00, 2500.00, 'GIA certified diamond'),
(2, 'James Wilson', '2024-01-15', 1400.00, 1000.00, 1600.00, 'Minor scratches');
