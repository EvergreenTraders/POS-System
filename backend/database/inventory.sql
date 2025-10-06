-- Create inventory_status table
CREATE TABLE IF NOT EXISTS inventory_status (
    status_id SERIAL PRIMARY KEY,
    status_code VARCHAR(20) NOT NULL UNIQUE,
    status_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT valid_status_code CHECK (status_code ~ '^[A-Z0-9_]+$')
);
-- First, drop the existing column if it exists
-- ALTER TABLE jewelry DROP COLUMN IF EXISTS images;
-- ALTER TABLE jewelry ADD COLUMN total_weight DECIMAL(10,2);
-- ALTER TABLE jewelry ADD COLUMN inventory_type DECIMAL(10,2);

-- Add inventory_type column with check constraint
ALTER TABLE jewelry ADD COLUMN inventory_type VARCHAR(20) 
    CHECK (inventory_type IN ('jewelry', 'bullion', 'hard_goods'));
--     ('IN_PROCESS', 'In Process', 'Item is being processed or worked on'),
--     ('SCRAP', 'Scrap', 'Item is scrap and not available for sale'),
--     ('RESERVED', 'Reserved', 'Item is reserved for a customer'),
--     ('SOLD', 'Sold', 'Item has been sold')
-- ON CONFLICT (status_code) DO NOTHING;

-- Create jewelry table for inventory
CREATE TABLE IF NOT EXISTS jewelry (
    item_id VARCHAR(10) PRIMARY KEY,
    -- Basic item info
    long_desc TEXT,
    short_desc TEXT,
    category VARCHAR(50) NOT NULL,
    brand VARCHAR(100),
    vintage BOOLEAN DEFAULT false,
    stamps TEXT, 
    images JSONB DEFAULT '[]',
    notes TEXT,
    
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
    
-- Create secondary_gems table to store multiple secondary gems per jewelry item
CREATE TABLE IF NOT EXISTS jewelry_secondary_gems (
    item_id VARCHAR(10) NOT NULL,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on item_id for faster lookups
CREATE INDEX idx_jewelry_secondary_gems_item_id ON jewelry_secondary_gems(item_id);

-- Create trigger function for secondary_gems updated_at
CREATE OR REPLACE FUNCTION update_jewelry_secondary_gems_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for secondary_gems updated_at
CREATE TRIGGER update_jewelry_secondary_gems_timestamp
    BEFORE UPDATE ON jewelry_secondary_gems
    FOR EACH ROW
    EXECUTE FUNCTION update_jewelry_secondary_gems_timestamp();
    
-- Add comments to secondary_gems table
COMMENT ON COLUMN jewelry_secondary_gems.secondary_gem_type IS 'Type of the secondary gemstones';
COMMENT ON COLUMN jewelry_secondary_gems.secondary_gem_shape IS 'Shape of the secondary gemstone (round, oval, etc)';
COMMENT ON COLUMN jewelry_secondary_gems.secondary_gem_weight IS 'Weight of the secondary gemstone in carats';
COMMENT ON COLUMN jewelry_secondary_gems.secondary_gem_color IS 'Color grade of the secondary gemstone';
COMMENT ON COLUMN jewelry_secondary_gems.secondary_gem_clarity IS 'Clarity grade of the secondary gemstone';
COMMENT ON COLUMN jewelry_secondary_gems.secondary_gem_cut IS 'Cut grade of the secondary gemstone';
COMMENT ON COLUMN jewelry_secondary_gems.secondary_gem_lab_grown IS 'Whether the secondary gemstone is lab-grown';
COMMENT ON COLUMN jewelry_secondary_gems.secondary_gem_authentic IS 'Whether the secondary gemstone is authentic';
COMMENT ON COLUMN jewelry_secondary_gems.secondary_gem_value IS 'Estimated value of the secondary gemstone';

