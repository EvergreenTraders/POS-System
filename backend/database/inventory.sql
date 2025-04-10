-- Drop existing table and its dependencies
-- Add metal_spot_price to existing jewelry table if it exists
-- DO $$ 
-- BEGIN
--     IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jewelry') THEN
--         ALTER TABLE jewelry ADD COLUMN IF NOT EXISTS metal_spot_price DECIMAL(10,2) DEFAULT 0.00;
--     END IF;
-- END $$;

    -- Drop status constraint if it exists
    DO $$ BEGIN
        ALTER TABLE jewelry DROP CONSTRAINT IF EXISTS valid_status;
    END $$;

-- Create jewelry table for inventory
CREATE TABLE IF NOT EXISTS jewelry (
    item_id VARCHAR(10) PRIMARY KEY,
    -- Basic item info
    long_desc TEXT,
    short_desc TEXT,
    category VARCHAR(50) NOT NULL,
    brand VARCHAR(100),
    damages TEXT,
    vintage BOOLEAN DEFAULT false,
    stamps TEXT,
    images JSONB DEFAULT '[]',
    
    -- Metal details
    metal_weight DECIMAL(10,2) NOT NULL,
    precious_metal_type VARCHAR(50),
    non_precious_metal_type VARCHAR(50),
    metal_purity VARCHAR(50),
    jewelry_color VARCHAR(50),
    purity_value DECIMAL(5,3),
    metal_spot_price DECIMAL(10,2) DEFAULT 0.00,
    est_metal_value DECIMAL(10,2),
    
    -- Gem details
    -- Primary gem
    primary_gem_type VARCHAR(50),
    primary_gem_category VARCHAR(20) CHECK (primary_gem_category IS NULL OR primary_gem_category IN ('diamond', 'stone')),
    primary_gem_size DECIMAL(10,2),
    primary_gem_quantity INTEGER,
    primary_gem_shape VARCHAR(50),
    primary_gem_weight DECIMAL(10,3),
    primary_gem_color VARCHAR(50),
    primary_gem_exact_color CHAR(1),
    primary_gem_clarity VARCHAR(50),
    primary_gem_cut VARCHAR(50),
    primary_gem_lab_grown BOOLEAN DEFAULT false,
    primary_gem_authentic BOOLEAN DEFAULT false,
    primary_gem_value DECIMAL(10,2),
    
    -- Secondary gem
    secondary_gem_type VARCHAR(50),
    secondary_gem_category VARCHAR(20) CHECK (secondary_gem_category IS NULL OR secondary_gem_category IN ('diamond', 'stone')),
    secondary_gem_size DECIMAL(10,2),
    secondary_gem_quantity INTEGER,
    secondary_gem_shape VARCHAR(50),
    secondary_gem_weight DECIMAL(10,3),
    secondary_gem_color VARCHAR(50),
    secondary_gem_exact_color CHAR(1),
    secondary_gem_clarity VARCHAR(50),
    secondary_gem_cut VARCHAR(50),
    secondary_gem_lab_grown BOOLEAN DEFAULT false,
    secondary_gem_authentic BOOLEAN DEFAULT false,
    secondary_gem_value DECIMAL(10,2),
    
    -- Pricing
    buy_price DECIMAL(10,2),
    pawn_value DECIMAL(10,2),
    retail_price DECIMAL(10,2),
    
    -- Status and tracking
    status VARCHAR(20) NOT NULL DEFAULT 'HOLD',
    location VARCHAR(50),
    condition VARCHAR(50),
    
    -- Dates
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    
    -- Constraints
   -- CONSTRAINT valid_status CHECK (status IN ('HOLD', 'in_stock', 'sold', 'pawned', 'reserved')),
    CONSTRAINT valid_metal_weight CHECK (metal_weight > 0),
    CONSTRAINT valid_buy_price CHECK (buy_price >= 0),
    CONSTRAINT valid_pawn_value CHECK (pawn_value >= 0),
    CONSTRAINT valid_retail_price CHECK (retail_price >= 0)
);

-- Create indexes for common queries
CREATE INDEX idx_jewelry_status ON jewelry(status);
CREATE INDEX idx_jewelry_category ON jewelry(category);
CREATE INDEX idx_jewelry_metal_type ON jewelry(precious_metal_type);
CREATE INDEX idx_jewelry_images ON jewelry USING GIN (images);

-- Add table and column comments
COMMENT ON TABLE jewelry IS 'Stores inventory of jewelry items with detailed specifications';
COMMENT ON COLUMN jewelry.item_id IS 'Unique identifier for the jewelry item';
COMMENT ON COLUMN jewelry.long_desc IS 'Detailed description of the jewelry item';
COMMENT ON COLUMN jewelry.short_desc IS 'Brief description of the jewelry item';
COMMENT ON COLUMN jewelry.metal_weight IS 'Weight of the metal in grams';
COMMENT ON COLUMN jewelry.precious_metal_type IS 'Type of precious metal (Gold, Silver, Platinum, etc.)';
COMMENT ON COLUMN jewelry.non_precious_metal_type IS 'Type of non-precious metal (Gold Plated, Gold Filled, etc.)';
COMMENT ON COLUMN jewelry.metal_purity IS 'Purity of the metal (14K, 18K, Sterling, etc)';
COMMENT ON COLUMN jewelry.jewelry_color IS 'Color of the metal (YG, WG, RG, etc)';
COMMENT ON COLUMN jewelry.purity_value IS 'Purity value of the metal (0.585 for 14K, 0.750 for 18K, etc)';
COMMENT ON COLUMN jewelry.est_metal_value IS 'Estimated value of the metal';
COMMENT ON COLUMN jewelry.primary_gem_type IS 'Type of the main gemstone';
COMMENT ON COLUMN jewelry.primary_gem_category IS 'Category of the main gemstone (diamond or stone)';
COMMENT ON COLUMN jewelry.primary_gem_shape IS 'Shape of the primary gemstone (round, oval, etc)';
COMMENT ON COLUMN jewelry.primary_gem_weight IS 'Weight of the primary gemstone in carats';
COMMENT ON COLUMN jewelry.primary_gem_color IS 'Color grade of the primary gemstone';
COMMENT ON COLUMN jewelry.primary_gem_clarity IS 'Clarity grade of the primary gemstone';
COMMENT ON COLUMN jewelry.primary_gem_cut IS 'Cut grade of the primary gemstone';
COMMENT ON COLUMN jewelry.primary_gem_lab_grown IS 'Whether the primary gemstone is lab-grown';
COMMENT ON COLUMN jewelry.primary_gem_authentic IS 'Whether the primary gemstone is authentic';
COMMENT ON COLUMN jewelry.primary_gem_value IS 'Estimated value of the primary gemstone';
COMMENT ON COLUMN jewelry.secondary_gem_type IS 'Type of the secondary gemstones';
COMMENT ON COLUMN jewelry.secondary_gem_shape IS 'Shape of the secondary gemstone (round, oval, etc)';
COMMENT ON COLUMN jewelry.secondary_gem_weight IS 'Weight of the secondary gemstone in carats';
COMMENT ON COLUMN jewelry.secondary_gem_color IS 'Color grade of the secondary gemstone';
COMMENT ON COLUMN jewelry.secondary_gem_clarity IS 'Clarity grade of the secondary gemstone';
COMMENT ON COLUMN jewelry.secondary_gem_cut IS 'Cut grade of the secondary gemstone';
COMMENT ON COLUMN jewelry.secondary_gem_lab_grown IS 'Whether the secondary gemstone is lab-grown';
COMMENT ON COLUMN jewelry.secondary_gem_authentic IS 'Whether the secondary gemstone is authentic';
COMMENT ON COLUMN jewelry.secondary_gem_value IS 'Estimated value of the secondary gemstone';
COMMENT ON COLUMN jewelry.images IS 'Array of image URLs for the jewelry item';

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_jewelry_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_jewelry_timestamp
    BEFORE UPDATE ON jewelry
    FOR EACH ROW
    EXECUTE FUNCTION update_jewelry_timestamp();

-- Insert sample data
-- INSERT INTO jewelry (
--     item_id, short_desc, long_desc, category, brand, damages, vintage, stamps, images,
--     metal_weight, precious_metal_type, metal_purity, jewelry_color, purity_value, est_metal_value,
--     primary_gem_type, primary_gem_category, primary_gem_size, primary_gem_quantity, primary_gem_shape,
--     primary_gem_weight, primary_gem_color, primary_gem_exact_color, primary_gem_clarity, primary_gem_cut,
--     primary_gem_lab_grown, primary_gem_authentic, primary_gem_value,
--     buy_price, pawn_value, retail_price, status
-- ) VALUES
-- ('RING001', '18K WG Diamond Ring', 'Beautiful 18K white gold solitaire ring with round brilliant diamond', 'Rings', 'Tiffany & Co.', NULL, false, '750 T&Co.', '["ring1.jpg", "ring1_side.jpg"]',
--  4.2, 'Gold', '18K', 'WG', 0.750, 350.00, 'Diamond', 'diamond', 6.5, 1, 'Round', 1.01, 'G', 'G', 'VS1', 'Excellent', false, true, 12000.00, 10000.00, 8000.00, 15000.00, 'HOLD'),

-- ('NECK001', 'Silver Sapphire Necklace', 'Vintage sterling silver necklace with Ceylon sapphire pendant', 'Necklaces', NULL, 'Minor surface scratches', true, '925', '["necklace1.jpg"]',
--  12.5, 'Silver', 'Sterling', 'S', 0.925, 180.00, 'Sapphire', 'stone', 8.0, 1, 'Oval', 2.15, 'Blue', 'B', 'VS', 'Very Good', false, true, 1200.00, 1000.00, 800.00, 1500.00, 'HOLD'),

-- ('BRAC001', '14K YG Tennis Bracelet', 'Classic 14K yellow gold tennis bracelet with diamonds', 'Bracelets', 'Cartier', NULL, false, '585 C', '["bracelet1.jpg"]',
--  15.3, 'Gold', '14K', 'YG', 0.585, 520.00, 'Diamond', 'diamond', 2.5, 25, 'Round', 5.00, 'F', 'F', 'VVS2', 'Excellent', false, true, 15000.00, 12000.00, 10000.00, 18000.00, 'in_stock'),

-- ('EARR001', 'Pearl Drop Earrings', '18K rose gold earrings with South Sea pearls', 'Earrings', 'Mikimoto', NULL, false, 'M 750', '["earrings1.jpg"]',
--  8.4, 'Gold', '18K', 'RG', 0.750, 420.00, 'Pearl', 'stone', 12.0, 2, 'Drop', 0.00, 'White', 'W', 'AAA', NULL, false, true, 3000.00, 2500.00, 2000.00, 4000.00, 'in_stock'),

-- ('PEND001', 'Emerald Pendant', 'Platinum pendant featuring Colombian emerald', 'Pendants', NULL, NULL, false, 'PLAT950', '["pendant1.jpg"]',
--  6.2, 'Platinum', 'Platinum', 'P', 0.950, 800.00, 'Emerald', 'stone', 7.5, 1, 'Cushion', 1.85, 'Green', 'G', 'VS', 'Very Good', false, true, 8500.00, 7000.00, 6000.00, 10000.00, 'in_stock'),

-- ('RING002', 'Ruby Cluster Ring', '14K yellow gold ring with ruby cluster', 'Rings', NULL, 'Light scratches on band', false, '585', '["ring2.jpg"]',
--  5.8, 'Gold', '14K', 'YG', 0.585, 200.00, 'Ruby', 'stone', 3.0, 7, 'Round', 2.10, 'Red', 'R', 'SI', 'Good', false, true, 2800.00, 2300.00, 2000.00, 3500.00, 'in_stock'),

-- ('BRAC002', 'Jade Bangle', 'Vintage jade bangle with 18K gold mount', 'Bracelets', NULL, NULL, true, '750', '["bangle1.jpg"]',
--  12.0, 'Gold', '18K', 'YG', 0.750, 600.00, 'Jade', 'stone', 55.0, 1, 'Round', 0.00, 'Green', 'G', 'A', NULL, false, true, 3500.00, 3000.00, 2500.00, 4500.00, 'HOLD'),

-- ('EARR002', 'Diamond Studs', 'Classic platinum diamond stud earrings', 'Earrings', 'Bvlgari', NULL, false, 'BVLGARI PT950', '["studs1.jpg"]',
--  4.0, 'Platinum', 'Platinum', 'P', 0.950, 500.00, 'Diamond', 'diamond', 4.0, 2, 'Round', 2.02, 'D', 'D', 'IF', 'Excellent', false, true, 20000.00, 18000.00, 15000.00, 25000.00, 'reserved'),

-- ('NECK002', 'Gold Chain', '22K yellow gold Cuban link chain', 'Necklaces', NULL, NULL, false, '916', '["chain1.jpg"]',
--  25.0, 'Gold', '22K', 'YG', 0.916, 1200.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2800.00, 2300.00, 3500.00, 'in_stock'),

-- ('PEND002', 'Opal Pendant', 'Sterling silver pendant with Australian opal', 'Pendants', NULL, 'Minor chip on back', false, '925', '["pendant2.jpg"]',
--  3.5, 'Silver', 'Sterling', 'S', 0.925, 45.00, 'Opal', 'stone', 15.0, 1, 'Oval', 3.50, 'Multi', 'M', 'AA', NULL, false, true, 450.00, 350.00, 300.00, 600.00, 'in_stock');
