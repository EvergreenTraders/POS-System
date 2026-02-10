-- Create trusted_pcs table for managing trusted PC MAC addresses
-- Used to restrict backups to designated PCs only

CREATE TABLE IF NOT EXISTS trusted_pcs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mac_address VARCHAR(17) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique MAC addresses
    CONSTRAINT unique_mac_address UNIQUE (mac_address)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trusted_pcs_mac_address ON trusted_pcs(mac_address);
CREATE INDEX IF NOT EXISTS idx_trusted_pcs_name ON trusted_pcs(name);

-- Add comments for documentation
COMMENT ON TABLE trusted_pcs IS 'Stores trusted PC MAC addresses for backup restrictions';
COMMENT ON COLUMN trusted_pcs.name IS 'Descriptive name for the PC (e.g., "Office PC", "Laptop-01")';
COMMENT ON COLUMN trusted_pcs.mac_address IS 'MAC address in format XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trusted_pcs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_trusted_pcs_timestamp ON trusted_pcs;
CREATE TRIGGER update_trusted_pcs_timestamp
    BEFORE UPDATE ON trusted_pcs
    FOR EACH ROW
    EXECUTE FUNCTION update_trusted_pcs_timestamp();
