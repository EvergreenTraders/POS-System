-- Create customer_account_links table for linking customer accounts
-- This allows one customer to access another customer's transactions

CREATE TABLE IF NOT EXISTS customer_account_links (
  id SERIAL PRIMARY KEY,
  primary_customer_id INTEGER NOT NULL,
  linked_customer_id INTEGER NOT NULL,
  link_type VARCHAR(50) DEFAULT 'full_access',
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,

  -- Foreign key constraints
  CONSTRAINT fk_primary_customer FOREIGN KEY (primary_customer_id)
    REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_linked_customer FOREIGN KEY (linked_customer_id)
    REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by)
    REFERENCES employees(employee_id),

  -- Prevent self-linking
  CONSTRAINT chk_no_self_link CHECK (primary_customer_id != linked_customer_id),

  -- Prevent duplicate links
  CONSTRAINT unique_account_link UNIQUE (primary_customer_id, linked_customer_id),

  -- Valid link types
  CONSTRAINT chk_link_type CHECK (link_type IN ('full_access', 'view_only', 'limited'))
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_account_links_primary ON customer_account_links(primary_customer_id);
CREATE INDEX IF NOT EXISTS idx_account_links_linked ON customer_account_links(linked_customer_id);
CREATE INDEX IF NOT EXISTS idx_account_links_active ON customer_account_links(is_active);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_account_links_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_account_links_timestamp
BEFORE UPDATE ON customer_account_links
FOR EACH ROW
EXECUTE FUNCTION update_account_links_timestamp();

-- Add comments for documentation
COMMENT ON TABLE customer_account_links IS 'Stores relationships between linked customer accounts';
COMMENT ON COLUMN customer_account_links.primary_customer_id IS 'The customer who can view linked accounts';
COMMENT ON COLUMN customer_account_links.linked_customer_id IS 'The customer whose data is being shared';
COMMENT ON COLUMN customer_account_links.link_type IS 'Type of access: full_access, view_only, or limited';
COMMENT ON COLUMN customer_account_links.is_active IS 'Whether the link is currently active';
COMMENT ON COLUMN customer_account_links.created_by IS 'Employee who created the link';
