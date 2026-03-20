-- Store Business Hours Table
-- Stores opening and closing times per day per store

CREATE TABLE IF NOT EXISTS store_hours (
    id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES stores(store_id),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_store_hours_times CHECK (is_closed OR close_time IS NULL OR open_time IS NULL OR close_time > open_time),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (store_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_store_hours_store_day ON store_hours(store_id, day_of_week);

-- Add constraint to existing table if not present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_store_hours_times') THEN
        ALTER TABLE store_hours ADD CONSTRAINT chk_store_hours_times
            CHECK (is_closed OR close_time IS NULL OR open_time IS NULL OR close_time > open_time);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_store_hours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS store_hours_updated_at ON store_hours;
CREATE TRIGGER store_hours_updated_at
    BEFORE UPDATE ON store_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_store_hours_updated_at();
