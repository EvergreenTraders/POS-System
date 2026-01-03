-- Drop the old customer_headers_preferences table
DROP TABLE IF EXISTS customer_headers_preferences CASCADE;

-- Create a function to generate the customer_headers_preferences table dynamically
DO $$
DECLARE
    column_record RECORD;
    create_table_sql TEXT;
    alter_table_sql TEXT := '';
BEGIN
    -- Start building the CREATE TABLE statement
    create_table_sql := 'CREATE TABLE customer_headers_preferences (
        id SERIAL PRIMARY KEY,
        header_preferences VARCHAR(50) NOT NULL DEFAULT ''customers'',
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP';

    -- Add show_ columns for each customer table column
    FOR column_record IN
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'customers'
        AND column_name NOT IN ('created_at', 'updated_at')
        ORDER BY ordinal_position
    LOOP
        create_table_sql := create_table_sql || ',
        show_' || column_record.column_name || ' BOOLEAN DEFAULT ' ||
        CASE
            -- Default true for important fields
            WHEN column_record.column_name IN ('id', 'first_name', 'last_name', 'email', 'phone', 'address_line1', 'city', 'state', 'id_type', 'id_number', 'status', 'risk_level', 'image') THEN 'true'
            -- Default false for less commonly used fields
            ELSE 'false'
        END;
    END LOOP;

    -- Close the CREATE TABLE statement
    create_table_sql := create_table_sql || '
    )';

    -- Execute the CREATE TABLE statement
    EXECUTE create_table_sql;

    -- Add comments
    EXECUTE 'COMMENT ON TABLE customer_headers_preferences IS ''Stores customer column visibility preferences for different contexts (customers table, transaction types)''';
    EXECUTE 'COMMENT ON COLUMN customer_headers_preferences.header_preferences IS ''Context: customers (for customer table) or transaction type (pawn, buy, sale, etc.)''';

END $$;

-- Create index on header_preferences
CREATE INDEX IF NOT EXISTS idx_customer_headers_preferences_context
ON customer_headers_preferences(header_preferences);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_customer_headers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_customer_headers_preferences_timestamp ON customer_headers_preferences;
CREATE TRIGGER update_customer_headers_preferences_timestamp
    BEFORE UPDATE ON customer_headers_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_headers_timestamp();

-- Insert default row for 'customers' context
INSERT INTO customer_headers_preferences (header_preferences)
VALUES ('customers')
ON CONFLICT DO NOTHING;

-- Insert rows for each transaction type
INSERT INTO customer_headers_preferences (header_preferences)
SELECT type FROM transaction_type
ON CONFLICT DO NOTHING;
