DO $$
BEGIN
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'non_precious_metal_type') THEN
        CREATE TABLE non_precious_metal_type (
            id SERIAL PRIMARY KEY,
            type VARCHAR(25) NOT NULL
        );
        INSERT INTO non_precious_metal_type (type) VALUES
        ('Gold Plated'),
        ('Gold Filled'),
        ('Titanium'),
        ('Tungsten'),
        ('Stainless'),
        ('Copper'),
        ('Silver Plate');
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'precious_metal_type') THEN
        CREATE TABLE precious_metal_type (
            id SERIAL PRIMARY KEY,
            type VARCHAR(25) NOT NULL
        );
        INSERT INTO precious_metal_type (type) VALUES
        ('Gold'),
        ('Platinum'),
        ('Silver'),
        ('Palladium');
    END IF;

    -- Add type_code column to precious_metal_type if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'precious_metal_type'
        AND column_name = 'type_code'
    ) THEN
        ALTER TABLE precious_metal_type ADD COLUMN type_code VARCHAR(10);

        -- Update existing rows with type codes
        UPDATE precious_metal_type SET type_code = 'G' WHERE type = 'Gold';
        UPDATE precious_metal_type SET type_code = 'P' WHERE type = 'Platinum';
        UPDATE precious_metal_type SET type_code = 'S' WHERE type = 'Silver';
        UPDATE precious_metal_type SET type_code = 'PD' WHERE type = 'Palladium';
        UPDATE precious_metal_type SET type_code = 'N' WHERE type = 'Non-Precious Metal Type';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'metal_type') THEN
        CREATE TABLE metal_type (
            id SERIAL PRIMARY KEY,
            type VARCHAR(25) NOT NULL
        );
        INSERT INTO metal_type (type) VALUES
        ('Jewelry');
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'metal_category') THEN
        CREATE TABLE metal_category (
            id SERIAL PRIMARY KEY,
            category VARCHAR(25) NOT NULL
        );
        INSERT INTO metal_category (category) VALUES
        ('Rings'),
        ('Necklaces'),
        ('Bracelets'),
        ('Earrings'),
        ('Single Earring'),
        ('Pendants'),
        ('Brooches'),
        ('Jewelry Accessories'),
        ('Miscellaneous Jewelry'),
        ('Costume & Special Metals'),
        ('Scrap'),
        ('Loose Diamonds and Stones');
    END IF;

    -- Add category_code column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'metal_category'
        AND column_name = 'category_code'
    ) THEN
        ALTER TABLE metal_category ADD COLUMN category_code VARCHAR(10);

        -- Update existing rows with category codes
        UPDATE metal_category SET category_code = 'R' WHERE category = 'Rings';
        UPDATE metal_category SET category_code = 'N' WHERE category = 'Necklaces';
        UPDATE metal_category SET category_code = 'B' WHERE category = 'Bracelets';
        UPDATE metal_category SET category_code = 'E' WHERE category = 'Earrings';
        UPDATE metal_category SET category_code = 'SE' WHERE category = 'Single Earring';
        UPDATE metal_category SET category_code = 'P' WHERE category = 'Pendants';
        UPDATE metal_category SET category_code = 'BR' WHERE category = 'Brooches';
        UPDATE metal_category SET category_code = 'J' WHERE category = 'Jewelry Accessories';
        UPDATE metal_category SET category_code = 'Misc' WHERE category = 'Miscellaneous Jewelry';
        UPDATE metal_category SET category_code = 'CSM' WHERE category = 'Costume & Special Metals';
        UPDATE metal_category SET category_code = 'S' WHERE category = 'Scrap';
        UPDATE metal_category SET category_code = 'LDS' WHERE category = 'Loose Diamonds and Stones';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'metal_color') THEN
        CREATE TABLE metal_color (
            id SERIAL PRIMARY KEY,
            precious_metal_type_id INT NOT NULL,
            color VARCHAR(25) NOT NULL,
            FOREIGN KEY (precious_metal_type_id) REFERENCES precious_metal_type(id)
        );
        INSERT INTO metal_color (precious_metal_type_id, color) VALUES
        (1, 'Yellow'),
        (1, 'White'),
        (1, '2 Tone'),
        (1, 'Tri-color'),
        (1, 'Rose-Red');
    END IF;

    -- Add color_code column to metal_color if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'metal_color'
        AND column_name = 'color_code'
    ) THEN
        ALTER TABLE metal_color ADD COLUMN color_code VARCHAR(10);

        -- Update existing rows with color codes
        UPDATE metal_color SET color_code = 'Y' WHERE color = 'Yellow';
        UPDATE metal_color SET color_code = 'W' WHERE color = 'White';
        UPDATE metal_color SET color_code = 'TT' WHERE color = '2 Tone';
        UPDATE metal_color SET color_code = 'T' WHERE color = 'Tri-color';
        UPDATE metal_color SET color_code = 'R' WHERE color = 'Rose-Red';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'metal_purity') THEN
        CREATE TABLE metal_purity (
            id SERIAL PRIMARY KEY,
            precious_metal_type_id INT NOT NULL,
            purity VARCHAR(25),
            value DECIMAL(5,3),
            FOREIGN KEY (precious_metal_type_id) REFERENCES precious_metal_type(id)
        );
        INSERT INTO metal_purity (precious_metal_type_id, purity, value) VALUES
        (1, '24K', 0.999),
        (1, '22K', 0.917),
        (1, '21K', 0.875),
        (1, '20K', 0.833),
        (1, '18K', 0.750),
        (1, '14K', 0.585),
        (1, '10K', 0.417),
        (1, '9K', 0.375),
        (1, '8K', 0.333),
        (2, NULL, 0.999),
        (2, NULL, 0.950),
        (2, NULL, 0.585),
        (3, 'Pure', 0.999),
        (3, 'Sterling', 0.925),
        (3, 'Coin', 0.900),
        (4, NULL, 0.999),
        (4, NULL, 0.950),
        (4, NULL, 0.500);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'metal_style_category') THEN
        CREATE TABLE metal_style_category (
            id SERIAL PRIMARY KEY,
            metal_type_id INT NOT NULL,
            metal_category_id INT NOT NULL,
            category VARCHAR(255) NOT NULL,
            FOREIGN KEY (metal_type_id) REFERENCES metal_type(id),
            FOREIGN KEY (metal_category_id) REFERENCES metal_category(id)
        );
        INSERT INTO metal_style_category (metal_type_id, metal_category_id, category) VALUES
        (1, 1, 'Gold-Diamond Rings'),
        (1, 1, 'Gold-Diamond & Stone Rings'),
        (1, 1, 'Silver-Diamond Rings'),
        (1, 1, 'Silver-Diamond & Stone Rings'),
        (1, 1, 'Platinum-Diamond Rings'),
        (1, 1, 'Platinum-Diamond & Stone Rings'),
        (1, 2, 'Diamond Necklaces'),
        (1, 2, 'Diamond & Stone Necklaces'),
        (1, 2, 'Tennis Necklaces'),
        (1, 3, 'Gold-Diamond Bracelets'),
        (1, 3, 'Gold-Diamond & Stone Bracelets'),
        (1, 3, 'Platinum-Diamond & Stone Bracelets'),
        (1, 3, 'Silver-Diamond Bracelets'),
        (1, 3, 'Silver-Diamond & Stone Bracelets'),
        (1, 4, 'Gold-Diamond Earrings'),
        (1, 4, 'Gold-Diamond & Stone Earrings'),
        (1, 4, 'Platinum-Diamond Earrings'),
        (1, 4, 'Platinum-Diamond & Stone Earrings'),
        (1, 4, 'Silver-Diamond Earrings'),
        (1, 4, 'Silver-Diamond & Stone Earrings'),
        (1, 5, 'Gold-Diamond Earring'),
        (1, 5, 'Gold-Diamond & Stone Earring'),
        (1, 5, 'Platinum-Diamond Earring'),
        (1, 5, 'Platinum-Diamond & Stone Earring'),
        (1, 5, 'Silver-Diamond Earring'),
        (1, 5, 'Silver-Diamond & Stone Earring'),
        (1, 6, 'Gold-Diamond SolitairePendants'),
        (1, 6, 'Gold-Multi-Diamond Pendants'),
        (1, 6, 'Gold-Diamond & Stone Pendants'),
        (1, 6, 'Platinum-Diamond Solitaire Pendants'),
        (1, 6, 'Platinum-Multi-Diamond Pendants'),
        (1, 6, 'Platinum-Diamond & Stone Pendants'),
        (1, 6, 'Silver-Diamond Pendants'),
        (1, 6, 'Silver-Diamond & Stone Pendants'),
        (1, 7, 'Gold-Diamond Brooches'),
        (1, 7, 'Gold-Diamond-Stone Brooches'),
        (1, 7, 'Platinum-Diamond Brooches'),
        (1, 7, 'Platinum-Diamond & Stone Brooches'),
        (1, 7, 'Silver-Diamond Brooches'),
        (1, 7, 'Silver-Diamond & Stone Brooches'),
        (1, 8, 'Gold-Diamond Cuff Links'),
        (1, 8, 'Gold-Diamond & Stone Cuff Links'),
        (1, 9, 'Gold-Diamond Misc.'),
        (1, 9, 'Gold-Diamond & Stone Misc.'),
        (1, 9, 'Platinum-Diamond Misc.'),
        (1, 9, 'Platinum-Diamond & Stone Misc.'),
        (1, 9, 'Silver-Diamond Misc.'),
        (1, 9, 'Silver-Diamond & Stone Misc.'),
        (1, 10, 'Special Metals'),
        (1, 11, 'Gold-Diamond Scrap'),
        (1, 11, 'Gold-Diamond-Stone Scrap'),
        (1, 11, 'Platinum-Diamond Scrap'),  
        (1, 11, 'Platinum-Diamond-Stone Scrap'),
        (1, 11, 'Silver-Diamond Scrap'),
        (1, 11, 'Silver-Diamond-Stone Scrap'),
        (1, 12, 'Diamonds'),
        (1, 12, 'Diamond Melee'),
        (1, 12, 'Diamond & Colored Melee');
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'metal_style_subcategory') THEN
        CREATE TABLE metal_style_subcategory (
            id SERIAL PRIMARY KEY,
            category_id INT NOT NULL,
            sub_category VARCHAR(255) NOT NULL,
            FOREIGN KEY (category_id) REFERENCES metal_style_category(id)
        );
        INSERT INTO metal_style_subcategory (category_id, sub_category) VALUES
        (1, 'Lady''s Diamond Solitaire Rings'),
        (1, 'Lady''s Diamond Cluster Rings'),
        (1, 'Lady''s Diamond Fashion Rings'),
        (1, 'Lady''s Diamond Anniversary Rings'),
        (1, 'Lady''s Diamond Ring Guards'),
        (1, 'Lady''s Diamond Engagement Rings'),
        (1, 'Lady''s Diamond Wedding Bands'),
        (1, 'Lady''s Diamond Wedding Sets'),
        (1, 'Gent''s Diamond Solitaire Rings'),
        (1, 'Gent''s Diamond Cluster Rings'),
        (1, 'Gent''s Diamond Fashion Rings'),
        (1, 'Gent''s Diamond Wedding Bands'),
        (1, 'Unisex Diamond Cluster Rings'),
        (1, 'Unisex Diamond Fashion Rings'),
        (1, 'Unisex Diamond Wedding Bands'),
        (1, 'Unisex Diamond Solitaire Rings'),
        (1, 'Child''s Diamond Cluster Rings'),
        (1, 'Child''s Diamond Fashion Rings'),
        (1, 'Child''s Diamond Solitaire Rings'),
        (2, 'Lady''s Stone & Diamond Rings'),
        (2, 'Gent''s Stone & Diamond Rings'),
        (2, 'Unisex Stone & Diamond Rings'),
        (2, 'Child''s Stone & Diamond Rings'),
        (3, 'Lady''s Silver-Diamond Rings'),
        (3, 'Gent''s Silver-Diamond Rings'),
        (3, 'Unisex Silver-Diamond Rings'),
        (3, 'Child''s Silver-Diamond Rings'),
        (3, 'Lady''s Silver-Diamond & Stone Rings'),
        (3, 'Gent''s Silver-Diamond & Stone Rings'),
        (3, 'Unisex Silver-Diamond & Stone Rings'),
        (3, 'Child''s Silver-Diamond & Stone Rings'),
        (3, 'Lady''s Platinum-Diamond Solitaire Rings'),
        (3, 'Lady''s Platinum-Diamond Clusters Rings'),  
        (3, 'Lady''s Platinum-Diamond Fashion Rings'),
        (3, 'Lady''s Platinum-Diamond Anniversary Rings'),
        (3, 'Lady''s Platinum-Diamond Ring Guards'),
        (3, 'Lady''s Platinum-Diamond Engagement Rings'),
        (3, 'Lady''s Platinum-Diamond Wedding Bands'),
        (3, 'Platinum-Diamond Wedding Sets'),
        (3, 'Gent''s Platinum-Diamond Solitaire Rings'),
        (3, 'Gent''s Platinum-Diamond Clusters Rings'),
        (3, 'Gent''s Platinum-Diamond Fashion Rings'),
        (3, 'Gent''s Platinum-Diamond Wedding Bands'),
        (3, 'Unisex Platinum-Diamond Solitaire Rings'),
        (3, 'Unisex Platinum-Diamond Clusters Rings'),
        (3, 'Unisex Platinum-Diamond Fashion Rings'),
        (3, 'Unisex Platinum-Diamond Wedding Bands'),
        (3, 'Child''s Platinum-Diamond Solitaire Rings'),
        (3, 'Child''s Platinum-Diamond Clusters Rings'),
        (3, 'Child''s Platinum-Diamond Fashion Rings'),
        (4, 'Lady''s Platinum-Diamond & Stone Rings'),
        (4, 'Gent''s Platinum-Diamond & Stone Rings'),
        (4, 'Unisex Platinum-Diamond & Stone Rings'),
        (4, 'Child''s Platinum-Diamond & Stone Rings'),
        (49, 'Lady''s Diamond Rings'),
        (49, 'Gent''s Diamond Rings'),
        (49, 'Unisex Diamond Rings'),
        (49, 'Child''s Diamond Rings'),
        (49, 'Lady''s Diamond Wedding Bands'),
        (49, 'Gent''s Diamond Wedding Bands'),
        (49, 'Unisex Diamond Wedding Bands');
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'metal') THEN
        CREATE TABLE metal (
            id SERIAL PRIMARY KEY,
            metal_type_id INT NOT NULL,
            metal_category_id INT NOT NULL,
            metal_style_subcategory_id INT NOT NULL,
            metal_color_id INT NOT NULL,
            metal_purity_id INT NOT NULL,
            weight DECIMAL NOT NULL,
            metal_spot_price DECIMAL NOT NULL,
            metal_spot_price_timestamp TIMESTAMP NOT NULL,
            metal_spot_price_website VARCHAR(255) NOT NULL,
            FOREIGN KEY (metal_type_id) REFERENCES metal_type(id),
            FOREIGN KEY (metal_category_id) REFERENCES metal_category(id),
            FOREIGN KEY (metal_style_subcategory_id) REFERENCES metal_style_subcategory(id),
            FOREIGN KEY (metal_color_id) REFERENCES metal_color(id),
            FOREIGN KEY (metal_purity_id) REFERENCES metal_purity(id)
        );
    END IF;
END $$;
