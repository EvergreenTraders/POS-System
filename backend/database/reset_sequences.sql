-- Reset all sequences to their correct values after data migration
-- This prevents "duplicate key" errors when sequences are out of sync with actual data

DO $$
DECLARE
    r RECORD;
    max_val BIGINT;
    seq_name TEXT;
BEGIN
    FOR r IN
        SELECT
            t.table_name,
            c.column_name,
            pg_get_serial_sequence(t.table_name, c.column_name) as sequence_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.column_default LIKE 'nextval%'
    LOOP
        IF r.sequence_name IS NOT NULL THEN
            EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', r.column_name, r.table_name) INTO max_val;
            EXECUTE format('SELECT setval(%L, %s, true)', r.sequence_name, GREATEST(max_val, 1));
            RAISE NOTICE 'Reset sequence % to %', r.sequence_name, GREATEST(max_val, 1);
        END IF;
    END LOOP;
END $$;
