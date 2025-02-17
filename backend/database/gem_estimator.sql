DO $$
BEGIN
    -- Stone Color Table
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'stone_color') THEN
        CREATE TABLE stone_color (
            id SERIAL PRIMARY KEY,
            color VARCHAR(50) NOT NULL UNIQUE
        );
        
        INSERT INTO stone_color (color) VALUES
        ('Yellow'),
        ('Green'),
        ('Blue'),
        ('Orange'),
        ('Red'),
        ('Purple'),
        ('Brown'),
        ('Black'),
        ('White'),
        ('Teal'),
        ('Gray'),
        ('Pink');
    END IF;

    -- Stone Shape Table
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'stone_shape') THEN
        CREATE TABLE stone_shape (
            id SERIAL PRIMARY KEY,
            shape VARCHAR(50) NOT NULL UNIQUE,
            image_path VARCHAR(255)
        );
        
        INSERT INTO stone_shape (shape, image_path) VALUES
        ('Round', '/images/stone_shapes/round.png'),
        ('Oval', '/images/stone_shapes/oval.png'),
        ('Emerald', '/images/stone_shapes/emerald.png'),
        ('Pear', '/images/stone_shapes/pear.png'),
        ('Cushion', '/images/stone_shapes/cushion.png'),
        ('Heart', '/images/stone_shapes/heart.png'),
        ('Princess', '/images/stone_shapes/princess.png'),
        ('Marquise', '/images/stone_shapes/marquise.png'),
        ('Radiant', '/images/stone_shapes/radiant.png'),
        ('Asscher', '/images/stone_shapes/asscher.png');
    END IF;

    -- Stone Types Table
    drop table if exists stone_types;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'stone_types') THEN
        CREATE TABLE stone_types (
            id SERIAL PRIMARY KEY,
            color VARCHAR(50) NOT NULL,
            type VARCHAR(50) NOT NULL,
            image_path VARCHAR(255)
        );
        
        INSERT INTO stone_types (color, type, image_path) VALUES
        ('Red', 'Red 1', '/images/stones/red/red 1.png'),
        ('Red', 'Red 2', '/images/stones/red/red 2.png'),
        ('Red', 'Red 3', '/images/stones/red/red 3.png'),
        ('Red', 'Red 4', '/images/stones/red/red 4.png'),
        ('Red', 'Red 5', '/images/stones/red/red 5.png'),
        ('Red', 'Red 6', '/images/stones/red/red 6.png'),
        ('Red', 'Red 7', '/images/stones/red/red 7.png'),
        ('Red', 'Red 8', '/images/stones/red/red 8.png'),
        ('Red', 'Red 9', '/images/stones/red/red 9.png'),
        ('Teal', 'Teal 1', '/images/stones/teal/teal 1.png'),
        ('Teal', 'Teal 2', '/images/stones/teal/teal 2.png'),
        ('Teal', 'Teal 3', '/images/stones/teal/teal 3.jpg'),
        ('Teal', 'Teal 4', '/images/stones/teal/teal 4.png'),
        ('Teal', 'Teal 5', '/images/stones/teal/teal 5.png');
    END IF;

    -- Stone Type Table
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'stone_type') THEN
        CREATE TABLE stone_type (
            id SERIAL PRIMARY KEY,
            type VARCHAR(50) NOT NULL UNIQUE,
            image_path VARCHAR(255)
        );
        
        INSERT INTO stone_type (type, image_path) VALUES
        ('Topaz', '/images/stones/topaz.png'),
        ('Tanzanite', '/images/stones/tanzanite.png'),
        ('Aquamarine', '/images/stones/aquamarine.png'),
        ('Garnet', '/images/stones/garnet.png'),
        ('Black Onyx', '/images/stones/black_onyx.png'),
        ('Amethyst', '/images/stones/amethyst.png'),
        ('Emerald', '/images/stones/emerald.png'),
        ('Sapphire', '/images/stones/sapphire.png'),
        ('Ruby', '/images/stones/ruby.png');
    END IF;

    -- Diamond Shape Table
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'diamond_shape') THEN
        CREATE TABLE diamond_shape (
            id SERIAL PRIMARY KEY,
            shape VARCHAR(50) NOT NULL UNIQUE,
            description TEXT,
            image_path VARCHAR(255)
        );
        
        INSERT INTO diamond_shape (shape, description, image_path) VALUES
        ('Round', 'Classic circular cut with maximum brilliance', '/images/diamonds/round.jpg'),
        ('Princess', 'Square cut with pointed corners', '/images/diamonds/princess.jpg'),
        ('Emerald', 'Rectangular step cut with cropped corners', '/images/diamonds/emerald.jpg'),
        ('Oval', 'Elongated round shape', '/images/diamonds/oval.jpg'),
        ('Cushion', 'Square or rectangular with rounded corners', '/images/diamonds/cushion.jpg'),
        ('Pear', 'Teardrop-shaped with a single point', '/images/diamonds/pear.jpg'),
        ('Marquise', 'Elongated shape with pointed ends', '/images/diamonds/marquise.jpg'),
        ('Radiant', 'Rectangular or square with cut corners', '/images/diamonds/radiant.jpg'),
        ('Asscher', 'Square step cut with cropped corners', '/images/diamonds/asscher.jpg'),
        ('Heart', 'Romantic heart-shaped cut', '/images/diamonds/heart.jpg'),
        ('Trillion', 'Triangular-shaped diamond', '/images/diamonds/trillion.jpg'),
        ('Baguette', 'Long, rectangular step cut', '/images/diamonds/baguette.jpg');
    END IF;

    -- Diamond Clarity Table
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'diamond_clarity') THEN
        CREATE TABLE diamond_clarity (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            image_path VARCHAR(255)
        );
        
        INSERT INTO diamond_clarity (name, image_path) VALUES
        ('Flawless', '/images/clarity/fl.png'),
        ('IF', '/images/clarity/if.png'),
        ('VVS1/VVS2', '/images/clarity/vvs.png'),
        ('VS1/VS2', '/images/clarity/vs.png'),
        ('SI1', '/images/clarity/si1.png'),
        ('SI2', '/images/clarity/si2.png'),
        ('I1', '/images/clarity/i1.png'),
        ('I2/I3', '/images/clarity/i2.png');
    END IF;

    -- Diamond Cut Table
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'diamond_cut') THEN
        CREATE TABLE diamond_cut (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            value CHAR(2) NOT NULL
        );
        
        INSERT INTO diamond_cut (name, value) VALUES
        ('Excellent', 'Ex'),
        ('Very Good', 'VG'),
        ('Good', 'G'),
        ('Fair', 'F'),
        ('Poor', 'P');
    END IF;

    -- Diamond Size Weight Table
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'diamond_size_weight') THEN
        CREATE TABLE diamond_size_weight (
            id SERIAL PRIMARY KEY,
            diamond_shape_id INTEGER NOT NULL,
            size VARCHAR(50) NOT NULL,
            weight DECIMAL(5,2) NOT NULL,
            UNIQUE(diamond_shape_id, size),
            FOREIGN KEY (diamond_shape_id) REFERENCES diamond_shape(id)
        );
        
        -- Princess Shape
        INSERT INTO diamond_size_weight (diamond_shape_id, size, weight) VALUES
        (2, '2.5 mm', 0.1),
        (2, '3.25 mm', 0.25),
        (2, '4.5 mm', 0.50),
        (2, '5 mm', 0.75),
        (2, '5.5 mm', 1.00),
        (2, '6 mm', 1.25),
        (2, '6.5 mm', 1.50),
        (2, '6.75 mm', 1.75),
        (2, '7 mm', 2.00),
        (2, '7.5 mm', 2.50),
        (2, '8 mm', 3.00),
        (2, '8.5 mm', 3.50),
        (2, '8.75 mm', 4.00),
        (2, '9.25 mm', 4.50),
        (2, '9.5 mm', 5.00),

        -- Round Shape
        (1, '3 mm', 0.1),
        (1, '4 mm', 0.25),
        (1, '5 mm', 0.50),
        (1, '5.75 mm', 0.75),
        (1, '6.5 mm', 1.00),
        (1, '6.8 mm', 1.25),
        (1, '7.3 mm', 1.50),
        (1, '7.75 mm', 1.75),
        (1, '8 mm', 2.00),
        (1, '8.7 mm', 2.50),
        (1, '9.1 mm', 3.00),

        -- Oval Shape
        (4, '4x3 mm', 0.15),
        (4, '5x3 mm', 0.25),
        (4, '6x4 mm', 0.50),
        (4, '7x5 mm', 0.75),
        (4, '7.7x5.7 mm', 1.00),
        (4, '8x6 mm', 1.25),
        (4, '8.5x6.5 mm', 1.50),
        (4, '9x6.5 mm', 1.75),
        (4, '9x7 mm', 2.00),
        (4, '10x8 mm', 2.50),
        (4, '12x8 mm', 3.00),

        -- Cushion Shape
        (5, '3.25 mm', 0.25),
        (5, '4.9 mm', 0.50),
        (5, '5.25 mm', 0.75),
        (5, '5.5 mm', 1.00),
        (5, '6 mm', 1.25),
        (5, '6.5 mm', 1.50),
        (5, '6.75 mm', 1.75),
        (5, '7 mm', 2.00),
        (5, '7.5 mm', 2.50),
        (5, '8 mm', 3.00),
        (5, '8.5 mm', 3.50),
        (5, '9 mm', 4.00),

        -- Emerald Shape
        (3, '4.30x3 mm', 0.25),
        (3, '6x4 mm', 0.50),
        (3, '6.5x4.5 mm', 0.75),
        (3, '7x5 mm', 1.00),
        (3, '7.3x5.3 mm', 1.25),
        (3, '7.5x5.5 mm', 1.50),
        (3, '8x6 mm', 1.75),
        (3, '8.5x6.5 mm', 2.00),
        (3, '9x7 mm', 2.50),
        (3, '9.3x7.5 mm', 3.00),
        (3, '9.75x7.7 mm', 3.50),
        (3, '10x8 mm', 4.00),
        (3, '10.5x8.5 mm', 4.50),
        (3, '11x9 mm', 5.00),

        -- Heart Shape
        (10, '4 mm', 0.25),
        (10, '5 mm', 0.50),
        (10, '6 mm', 0.75),
        (10, '6.5 mm', 1.00),
        (10, '7 mm', 1.25),
        (10, '7.5 mm', 1.50),
        (10, '7.7 mm', 1.75),
        (10, '8 mm', 2.00),
        (10, '8.5 mm', 2.50),
        (10, '9 mm', 3.00),
        (10, '10 mm', 3.50),
        (10, '10.5 mm', 4.00),
        (10, '11 mm', 4.50),
        (10, '11.5 mm', 5.00),

        -- Pear Shape
        (6, '5x3 mm', 0.25),
        (6, '6x4 mm', 0.50),
        (6, '7x5 mm', 0.75),
        (6, '7.7x5.7 mm', 1.00),
        (6, '8x6 mm', 1.25),
        (6, '8.5x6.5 mm', 1.50),
        (6, '10x6 mm', 1.75),
        (6, '9x7 mm', 2.00),
        (6, '10x8 mm', 2.50),
        (6, '12x8 mm', 3.00),
        (6, '12x9 mm', 3.50),
        (6, '14x8 mm', 4.00),
        (6, '14.5x9 mm', 4.50),
        (6, '15x9 mm', 5.00),

        -- Marquise Shape
        (7, '6x3 mm', 0.25),
        (7, '8x4 mm', 0.50),
        (7, '9x4.5 mm', 0.75),
        (7, '10x5 mm', 1.00),
        (7, '11x5.5 mm', 1.25),
        (7, '12x6 mm', 1.50),
        (7, '12.5x6.25 mm', 1.75),
        (7, '13x6.5 mm', 2.00),
        (7, '14x7 mm', 2.50),
        (7, '15x7 mm', 3.00),
        (7, '15x8 mm', 3.50),
        (7, '16.5x8.25 mm', 4.00),
        (7, '16.75x8.5 mm', 4.50),
        (7, '17x8.5 mm', 5.00),

        -- Radiant Shape
        (8, '4.3x3 mm', 0.25),
        (8, '6x4 mm', 0.50),
        (8, '6.5x4.5 mm', 0.75),
        (8, '7x5 mm', 1.00),
        (8, '7.3x5.3 mm', 1.25),
        (8, '7.5x5.8 mm', 1.50),
        (8, '8x6 mm', 1.75),
        (8, '8.2x6.2 mm', 2.00),
        (8, '9x7 mm', 2.50),
        (8, '9.5x7.5 mm', 3.00),
        (8, '10x8 mm', 3.50),
        (8, '10.2x8.2 mm', 4.00),
        (8, '10.5x8.5 mm', 4.50),
        (8, '11x9 mm', 5.00),

        -- Asscher Shape
        (9, '3.25 mm', 0.25),
        (9, '4.5 mm', 0.50),
        (9, '5 mm', 0.75),
        (9, '5.5 mm', 1.00),
        (9, '6 mm', 1.25),
        (9, '6.5 mm', 1.50),
        (9, '6.7 mm', 1.75),
        (9, '7 mm', 2.00),
        (9, '7.5 mm', 2.50),
        (9, '8 mm', 3.00),
        (9, '8.5 mm', 3.50),
        (9, '9 mm', 4.00),
        (9, '9.25 mm', 4.50),
        (9, '9.5 mm', 5.00);
    END IF;

    -- Diamond Color Table
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'diamond_color') THEN
        CREATE TABLE diamond_color (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            color VARCHAR(7) NOT NULL,
            range VARCHAR(10) NOT NULL
        );
        
        INSERT INTO diamond_color (name, color, range) VALUES
        ('Colorless', '#ffffff', 'D-F'),
        ('Near Colorless', '#f7f7e8', 'G-J'),
        ('Faint Color', '#f7f3d9', 'K-M'),
        ('Very Light Color', '#f7efc5', 'N-R'),
        ('Light Color', '#f7ebb2', 'S-Z');
    END IF;
END $$;