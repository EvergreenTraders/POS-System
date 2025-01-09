DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_tables WHERE tablename = 'price_estimates') THEN    
    CREATE TABLE price_estimates (
        transaction_type VARCHAR(20),
        estimate DECIMAL(5, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO price_estimates (transaction_type, estimate) VALUES
    ('pawn', 60.00),
    ('buy', 70.00),
    ('retail', 80.00);
    END IF;
END $$;