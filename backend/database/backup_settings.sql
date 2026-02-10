-- Create backup_settings table for managing backup configuration
-- This table stores a single row with all backup settings

CREATE TABLE IF NOT EXISTS backup_settings (
    id SERIAL PRIMARY KEY,
    enable_local_backup BOOLEAN NOT NULL DEFAULT FALSE,
    designated_pcs_only BOOLEAN NOT NULL DEFAULT FALSE,
    monthly_backup BOOLEAN NOT NULL DEFAULT FALSE,
    monthly_backup_count INTEGER NOT NULL DEFAULT 12,
    weekly_backup BOOLEAN NOT NULL DEFAULT FALSE,
    weekly_backup_count INTEGER NOT NULL DEFAULT 4,
    daily_backup BOOLEAN NOT NULL DEFAULT FALSE,
    daily_backup_count INTEGER NOT NULL DEFAULT 7,
    backup_file_path VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one row exists
    CONSTRAINT single_backup_settings CHECK (id = 1)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_backup_settings_id ON backup_settings(id);

-- Add comments for documentation
COMMENT ON TABLE backup_settings IS 'Stores backup configuration settings (single row table)';
COMMENT ON COLUMN backup_settings.enable_local_backup IS 'Whether local backups are enabled';
COMMENT ON COLUMN backup_settings.designated_pcs_only IS 'Whether backups are restricted to trusted PCs only';
COMMENT ON COLUMN backup_settings.monthly_backup IS 'Whether monthly backups are enabled';
COMMENT ON COLUMN backup_settings.monthly_backup_count IS 'Number of monthly backups to keep';
COMMENT ON COLUMN backup_settings.weekly_backup IS 'Whether weekly backups are enabled';
COMMENT ON COLUMN backup_settings.weekly_backup_count IS 'Number of weekly backups to keep';
COMMENT ON COLUMN backup_settings.daily_backup IS 'Whether daily backups are enabled';
COMMENT ON COLUMN backup_settings.daily_backup_count IS 'Number of daily backups to keep';
COMMENT ON COLUMN backup_settings.backup_file_path IS 'File system path where backups should be stored';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_backup_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_backup_settings_timestamp ON backup_settings;
CREATE TRIGGER update_backup_settings_timestamp
    BEFORE UPDATE ON backup_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_backup_settings_timestamp();

-- Insert default row if it doesn't exist
INSERT INTO backup_settings (id, enable_local_backup, designated_pcs_only, monthly_backup, monthly_backup_count, weekly_backup, weekly_backup_count, daily_backup, daily_backup_count, backup_file_path)
VALUES (1, FALSE, FALSE, FALSE, 12, FALSE, 4, FALSE, 7, NULL)
ON CONFLICT (id) DO NOTHING;
