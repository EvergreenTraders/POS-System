-- Table to store item attribute values
CREATE TABLE IF NOT EXISTS item_attributes (
  id SERIAL PRIMARY KEY,
  item_id VARCHAR(50) NOT NULL,
  attribute_name VARCHAR(100) NOT NULL,
  attribute_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id, attribute_name)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_item_attributes_item_id ON item_attributes(item_id);
CREATE INDEX IF NOT EXISTS idx_item_attributes_name ON item_attributes(attribute_name);

-- Table to store attribute configuration (attribute names)
CREATE TABLE IF NOT EXISTS attribute_config (
  id SERIAL PRIMARY KEY,
  attribute_name VARCHAR(100) NOT NULL UNIQUE,
  attribute_type VARCHAR(50) DEFAULT 'dropdown', -- Type: dropdown, text, checkbox, number
  attribute_options TEXT[], -- Array of possible values (for dropdown)
  inventory_type VARCHAR(50), -- NULL means applies to all types
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for attribute config
CREATE INDEX IF NOT EXISTS idx_attribute_config_inventory_type ON attribute_config(inventory_type);

-- Add attribute_type column if it doesn't exist (for existing installations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attribute_config' AND column_name = 'attribute_type'
  ) THEN
    ALTER TABLE attribute_config ADD COLUMN attribute_type VARCHAR(50) DEFAULT 'dropdown';
    UPDATE attribute_config SET attribute_type = 'dropdown' WHERE attribute_type IS NULL;
  END IF;
END $$;
