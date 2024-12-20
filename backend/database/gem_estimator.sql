DO $$
BEGIN
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
END $$;

DO $$
BEGIN
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
END $$;