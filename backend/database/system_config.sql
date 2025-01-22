DO $$
BEGIN
    DROP TABLE IF EXISTS price_estimates;
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
END $$;