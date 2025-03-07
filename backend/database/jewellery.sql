-- Estimations table to store all estimator inputs and results
CREATE TABLE jewelry (
    estimation_id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES jewellery_items(item_id),
    customer_id INTEGER REFERENCES customers(customer_id),
    
    -- Metal Details
    metal_weight NUMERIC(10,3),
    precious_metal_type VARCHAR(20),
    non_precious_metal_type VARCHAR(20),
    jewelry_color VARCHAR(20),
    metal_purity VARCHAR(20),
    metal_purity_value NUMERIC(5,2),
    metal_category VARCHAR(50),
    metal_spot_price NUMERIC(10,2),
    est_metal_value NUMERIC(10,2),
    
    -- Primary Gem Details (Common)
    primary_gem_type VARCHAR(50), -- 'Diamond' or other stone types
    
    -- Primary Diamond Specific Details
    primary_diamond_shape VARCHAR(50),
    primary_diamond_weight NUMERIC(10,3),
    primary_diamond_quantity INTEGER,
    primary_diamond_clarity VARCHAR(20), -- Only for diamonds: IF, VVS1, VVS2, etc.
    primary_diamond_color VARCHAR(20),   
    primary_diamond_exact_color VARCHAR(2),
    primary_diamond_cut VARCHAR(20),     -- Only for diamonds: Excellent, Very Good, etc.
    primary_diamond_certification VARCHAR(50),
    primary_diamond_lab_grown BOOLEAN,
    primary_diamond_estimated_value NUMERIC(10,2),
    
    -- Primary Stone Specific Details
    primary_stone_quantity INTEGER,    
    primary_stone_authentic BOOLEAN,
    primary_stone_color VARCHAR(50),     
    primary_stone_type VARCHAR(50),    
    primary_stone_shape VARCHAR(50),  
    primary_stone_weight NUMERIC(10,3),    
    
    -- Secondary Gem Details (Common)
    secondary_gem_type VARCHAR(50),
    
    -- Secondary Diamond Specific Details
    secondary_diamond_shape VARCHAR(50),
    secondary_diamond_weight NUMERIC(10,3),
    secondary_diamond_quantity INTEGER,
    secondary_diamond_clarity VARCHAR(20), -- Only for diamonds: IF, VVS1, VVS2, etc.
    secondary_diamond_color VARCHAR(20),   -- Only for diamonds: D, E, F, etc.
    secondary_diamond_exact_color VARCHAR(2),
    secondary_diamond_cut VARCHAR(20),     -- Only for diamonds: Excellent, Very Good, etc.
    secondary_diamond_certification VARCHAR(50),
    secondary_diamond_lab_grown BOOLEAN,
    secondary_diamond_estimated_value NUMERIC(10,2),
    
    -- Secondary Stone Specific Details
    secondary_stone_quantity INTEGER,    
    secondary_stone_authentic BOOLEAN,
    secondary_stone_color VARCHAR(50),      
    secondary_stone_type VARCHAR(50),    
    secondary_stone_shape VARCHAR(50),  
    secondary_stone_weight NUMERIC(10,3), 
    
    -- Valuation Details
    valuation_type VARCHAR(20), -- 'pawn', 'buy', 'retail'
    estimated_value NUMERIC(10,2),
    final_value NUMERIC(10,2),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estimated_by VARCHAR(100),
    
    -- Additional Metadata
    notes TEXT,
    brand VARCHAR(100),
    age_estimate VARCHAR(50),
    stamps TEXT,
    vintage BOOLEAN
);

-- Table to store images related to estimations
CREATE TABLE jewelry_images (
    image_id SERIAL PRIMARY KEY,
    estimation_id INTEGER REFERENCES jewelry(estimation_id),
    image_path TEXT,
    image_type VARCHAR(50), -- 'front', 'back', 'side', 'detail', 'hallmark', etc.
    image_description TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data for diamond ring estimation
INSERT INTO jewelry (
    item_id,
    customer_id,
    metal_weight,
    precious_metal_type,
    non_precious_metal_type,
    jewelry_color,
    metal_purity,
    metal_purity_value,
    metal_category,
    metal_spot_price,
    est_metal_value,
    primary_gem_type,
    primary_diamond_shape,
    primary_diamond_weight,
    primary_diamond_quantity,
    primary_diamond_clarity,
    primary_diamond_color,
    primary_diamond_exact_color,
    primary_diamond_cut,
    primary_diamond_certification,
    primary_diamond_lab_grown,
    primary_diamond_estimated_value,
    primary_stone_quantity,
    primary_stone_authentic,
    primary_stone_color,
    primary_stone_type,
    primary_stone_shape,
    primary_stone_weight,
    secondary_gem_type,
    secondary_diamond_shape,
    secondary_diamond_weight,
    secondary_diamond_quantity,
    secondary_diamond_clarity,
    secondary_diamond_color,
    secondary_diamond_exact_color,
    secondary_diamond_cut,
    secondary_diamond_certification,
    secondary_diamond_lab_grown,
    secondary_diamond_estimated_value,
    secondary_stone_quantity,
    secondary_stone_authentic,
    secondary_stone_color,
    secondary_stone_type,
    secondary_stone_shape,
    secondary_stone_weight,
    valuation_type,
    estimated_value,
    final_value,
    created_at,
    updated_at,
    estimated_by,
    notes,
    brand,
    age_estimate,
    stamps,
    vintage
) VALUES (
    1,             -- item_id
    1,             -- customer_id
    4.2,           -- metal_weight (grams)
    'Gold',        -- precious_metal_type
    NULL,          -- non_precious_metal_type
    'Yellow',      -- jewelry_color
    '18K',         -- metal_purity
    75.0,          -- metal_purity_value
    'Precious',    -- metal_category
    2000.00,       -- metal_spot_price (per oz)
    504.00,        -- est_metal_value
    'Diamond',     -- primary_gem_type
    'Round',       -- primary_diamond_shape
    1.02,          -- primary_diamond_weight
    1,             -- primary_diamond_quantity
    'VS1',         -- primary_diamond_clarity
    'F',           -- primary_diamond_color
    'F',           -- primary_diamond_exact_color
    'Excellent',   -- primary_diamond_cut
    'GIA',         -- primary_diamond_certification
    false,         -- primary_diamond_lab_grown
    5500.00,       -- primary_diamond_estimated_value
    NULL,          -- primary_stone_quantity
    NULL,          -- primary_stone_authentic
    NULL,          -- primary_stone_color
    NULL,          -- primary_stone_type
    NULL,          -- primary_stone_shape
    NULL,          -- primary_stone_weight
    NULL,          -- secondary_gem_type
    NULL,          -- secondary_diamond_shape
    NULL,          -- secondary_diamond_weight
    NULL,          -- secondary_diamond_quantity
    NULL,          -- secondary_diamond_clarity
    NULL,          -- secondary_diamond_color
    NULL,          -- secondary_diamond_exact_color
    NULL,          -- secondary_diamond_cut
    NULL,          -- secondary_diamond_certification
    NULL,          -- secondary_diamond_lab_grown
    NULL,          -- secondary_diamond_estimated_value
    NULL,          -- secondary_stone_quantity
    NULL,          -- secondary_stone_authentic
    NULL,          -- secondary_stone_color
    NULL,          -- secondary_stone_type
    NULL,          -- secondary_stone_shape
    NULL,          -- secondary_stone_weight
    'retail',      -- valuation_type
    6500.00,       -- estimated_value
    6000.00,       -- final_value
    CURRENT_TIMESTAMP, -- created_at
    CURRENT_TIMESTAMP, -- updated_at
    'John Smith',  -- estimated_by
    'Classic solitaire engagement ring with excellent craftsmanship',  -- notes
    'Tiffany & Co',  -- brand
    '2020-2023',     -- age_estimate
    'T&Co PT950',    -- stamps
    false            -- vintage
);

-- Sample data for colored stone (sapphire) estimation
INSERT INTO jewelry (
    item_id,
    customer_id,
    metal_weight,
    precious_metal_type,
    non_precious_metal_type,
    jewelry_color,
    metal_purity,
    metal_purity_value,
    metal_category,
    metal_spot_price,
    est_metal_value,
    primary_gem_type,
    primary_diamond_shape,
    primary_diamond_weight,
    primary_diamond_quantity,
    primary_diamond_clarity,
    primary_diamond_color,
    primary_diamond_exact_color,
    primary_diamond_cut,
    primary_diamond_certification,
    primary_diamond_lab_grown,
    primary_diamond_estimated_value,
    primary_stone_quantity,
    primary_stone_authentic,
    primary_stone_color,
    primary_stone_type,
    primary_stone_shape,
    primary_stone_weight,
    secondary_gem_type,
    secondary_diamond_shape,
    secondary_diamond_weight,
    secondary_diamond_quantity,
    secondary_diamond_clarity,
    secondary_diamond_color,
    secondary_diamond_exact_color,
    secondary_diamond_cut,
    secondary_diamond_certification,
    secondary_diamond_lab_grown,
    secondary_diamond_estimated_value,
    secondary_stone_quantity,
    secondary_stone_authentic,
    secondary_stone_color,
    secondary_stone_type,
    secondary_stone_shape,
    secondary_stone_weight,
    valuation_type,
    estimated_value,
    final_value,
    created_at,
    updated_at,
    estimated_by,
    notes,
    brand,
    age_estimate,
    stamps,
    vintage
) VALUES (
    2,             -- item_id
    2,             -- customer_id
    6.8,           -- metal_weight
    'Gold',        -- precious_metal_type
    NULL,          -- non_precious_metal_type
    'White',       -- jewelry_color
    '18K',         -- metal_purity
    75.0,          -- metal_purity_value
    'Precious',    -- metal_category
    2000.00,       -- metal_spot_price
    816.00,        -- est_metal_value
    'Sapphire',    -- primary_gem_type
    NULL,          -- primary_diamond_shape
    NULL,          -- primary_diamond_weight
    NULL,          -- primary_diamond_quantity
    NULL,          -- primary_diamond_clarity
    NULL,          -- primary_diamond_color
    NULL,          -- primary_diamond_exact_color
    NULL,          -- primary_diamond_cut
    NULL,          -- primary_diamond_certification
    NULL,          -- primary_diamond_lab_grown
    NULL,          -- primary_diamond_estimated_value
    1,             -- primary_stone_quantity
    true,          -- primary_stone_authentic
    'Royal Blue',  -- primary_stone_color
    'Ceylon Sapphire', -- primary_stone_type
    'Oval',        -- primary_stone_shape
    3.15,          -- primary_stone_weight
    'Diamond',     -- secondary_gem_type
    'Round',       -- secondary_diamond_shape
    0.05,          -- secondary_diamond_weight
    12,            -- secondary_diamond_quantity
    'VS2',         -- secondary_diamond_clarity
    'G',           -- secondary_diamond_color
    'G',           -- secondary_diamond_exact_color
    'Very Good',   -- secondary_diamond_cut
    NULL,          -- secondary_diamond_certification
    false,         -- secondary_diamond_lab_grown
    1800.00,       -- secondary_diamond_estimated_value
    NULL,          -- secondary_stone_quantity
    NULL,          -- secondary_stone_authentic
    NULL,          -- secondary_stone_color
    NULL,          -- secondary_stone_type
    NULL,          -- secondary_stone_shape
    NULL,          -- secondary_stone_weight
    'retail',      -- valuation_type
    8500.00,       -- estimated_value
    8000.00,       -- final_value
    CURRENT_TIMESTAMP, -- created_at
    CURRENT_TIMESTAMP, -- updated_at
    'Jane Doe',    -- estimated_by
    'Stunning Ceylon sapphire ring with diamond halo',  -- notes
    'Custom Made',  -- brand
    '2015-2020',   -- age_estimate
    '750 CE',      -- stamps
    false           -- vintage
);

-- Sample image data for the diamond ring
INSERT INTO jewelry_images (
    estimation_id,
    image_path,
    image_type,
    image_description,
    upload_date
) VALUES 
(1, '/uploads/estimations/diamond_ring_front.jpg', 'front', 'Front view of solitaire diamond ring', CURRENT_TIMESTAMP),
(1, '/uploads/estimations/diamond_ring_side.jpg', 'side', 'Side profile showing setting details', CURRENT_TIMESTAMP),
(1, '/uploads/estimations/diamond_ring_hallmark.jpg', 'hallmark', 'Tiffany & Co hallmark and platinum stamp', CURRENT_TIMESTAMP);

-- Sample image data for the sapphire ring
INSERT INTO jewelry_images (
    estimation_id,
    image_path,
    image_type,
    image_description,
    upload_date
) VALUES 
(2, '/uploads/estimations/sapphire_ring_front.jpg', 'front', 'Front view of sapphire ring with diamond halo', CURRENT_TIMESTAMP),
(2, '/uploads/estimations/sapphire_ring_top.jpg', 'top', 'Top view showing sapphire color and clarity', CURRENT_TIMESTAMP),
(2, '/uploads/estimations/sapphire_ring_marks.jpg', 'hallmark', 'Gold purity marks and manufacturer stamp', CURRENT_TIMESTAMP),
(2, '/uploads/estimations/sapphire_ring_side.jpg', 'side', 'Side view showing halo setting', CURRENT_TIMESTAMP);
