DO $$
BEGIN

    -- user preferences
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'user_preferences') THEN    
        CREATE TABLE user_preferences (
            id SERIAL PRIMARY KEY,
            preference_name VARCHAR(255) NOT NULL,
            preference_value VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (preference_name) 
        );
        INSERT INTO user_preferences (preference_name, preference_value) VALUES 
            ('cameraEnabled', TRUE),
            ('caratConversion', TRUE);
    END IF;

    -- live pricing
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'live_pricing') THEN    
        CREATE TABLE live_pricing (
            islivepricing BOOLEAN NOT NULL DEFAULT FALSE,
            per_day BOOLEAN NOT NULL DEFAULT FALSE,
            per_transaction BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO live_pricing (islivepricing, per_day, per_transaction) VALUES (FALSE, FALSE, FALSE);
    END IF;

    -- live spot prices
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'live_spot_prices') THEN    
        CREATE TABLE live_spot_prices (
            CADXAG DECIMAL(10, 2) NOT NULL,
            CADXAU DECIMAL(10, 2) NOT NULL,
            CADXPD DECIMAL(10, 2) NOT NULL,
            CADXPT DECIMAL(10, 2) NOT NULL,
            last_fetched TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO live_spot_prices (CADXAG, CADXAU, CADXPD, CADXPT) VALUES (2400.00, 1000.00, 800.00, 2500.00);
    END IF;   

    -- manual spot prices
     IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'spot_prices') THEN    
        CREATE TABLE spot_prices (
            precious_metal_type_id INT NOT NULL,
            spot_price DECIMAL(10, 2) NOT NULL,
            FOREIGN KEY (precious_metal_type_id) REFERENCES precious_metal_type(id)
        );
        INSERT INTO spot_prices (precious_metal_type_id, spot_price) VALUES
        (1, 2400.00),
        (2, 1000.00),
        (3, 800.00),
        (4, 2500.00);
    END IF;

    -- diamond estimates
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'diamond_estimates') THEN    
        CREATE TABLE diamond_estimates (
            id SERIAL PRIMARY KEY,
            transaction_type VARCHAR(20),
            estimate DECIMAL(5, 2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO diamond_estimates (transaction_type, estimate) VALUES
    ('pawn', 60.00),
    ('buy', 70.00),
    ('retail', 80.00);
    END IF;

    -- Drop the price_estimates table if it exists
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'price_estimates') THEN    
    CREATE TABLE price_estimates (
        precious_metal_type_id INT NOT NULL,
        transaction_type VARCHAR(20),
        estimate DECIMAL(5, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (precious_metal_type_id) REFERENCES precious_metal_type(id)
    );
    INSERT INTO price_estimates (precious_metal_type_id, transaction_type, estimate) VALUES
    (1, 'pawn', 60.00),
    (1, 'buy', 70.00),
    (1, 'retail', 80.00),
    (2, 'pawn', 50.00),
    (2, 'buy', 60.00),
    (2, 'retail', 70.00),
    (3, 'pawn', 40.00),
    (3, 'buy', 50.00),
    (3, 'retail', 60.00),
    (4, 'pawn', 30.00),
    (4, 'buy', 40.00),
    (4, 'retail', 50.00);
    END IF;

    -- carat to gram conversion
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'carat_to_gram_conversion') THEN    
        CREATE TABLE carat_to_gram_conversion (
            id SERIAL PRIMARY KEY,
            carats INT NOT NULL DEFAULT 1,
            grams DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Insert default conversion value
        INSERT INTO carat_to_gram_conversion (carats, grams) VALUES (1, 0.20);
    END IF;

END $$;