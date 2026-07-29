-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Canada',
    
    -- Identity verification
    id_type VARCHAR(50) NOT NULL,  -- e.g., 'driver_license', 'passport', 'national_id'
    id_number VARCHAR(100) NOT NULL,
    id_expiry_date DATE,
    
    -- Physical characteristics
    gender VARCHAR(10),
    height NUMERIC(5,2),  -- in cm
    weight NUMERIC(5,2),  -- in kg
    
    -- Additional customer information
    date_of_birth DATE,
    
    -- Customer status and metadata
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    risk_level VARCHAR(20) DEFAULT 'normal' CHECK (risk_level IN ('low', 'normal', 'high')),
    notes TEXT,
    image BYTEA,
    id_image_front BYTEA,
    id_image_back BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_id_number ON customers(id_number);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_customer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp update
DROP TRIGGER IF EXISTS update_customer_timestamp ON customers;
CREATE TRIGGER update_customer_timestamp
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_timestamp();

-- Add comments for documentation
COMMENT ON TABLE customers IS 'Stores customer information including identity verification details';
COMMENT ON COLUMN customers.id_type IS 'Type of identification document provided';
COMMENT ON COLUMN customers.id_number IS 'Unique number of the identification document';
COMMENT ON COLUMN customers.risk_level IS 'Risk assessment level of the customer';
COMMENT ON COLUMN customers.status IS 'Current status of the customer account';
COMMENT ON COLUMN customers.notes IS 'Additional notes or comments about the customer';

-- ALTER commands to make id_type and id_number nullable (not mandatory fields)
ALTER TABLE customers ALTER COLUMN id_type DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN id_number DROP NOT NULL;

-- Add tax_exempt column for customers who are tax exempt
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN customers.tax_exempt IS 'Whether the customer is exempt from sales tax';

-- Fix sequence after data migration (reset to max id + 1)
SELECT setval('customers_id_seq', COALESCE((SELECT MAX(id) FROM customers), 0) + 1, false);

-- Store credit: previously computed live on every read by summing
-- payments.payment_method = 'store_credit' rows (signed by whether the
-- linked transaction was payable or receivable). Now stored directly and
-- kept in sync by a trigger on the payments table (see below), so reads
-- are a simple column lookup instead of a full-history aggregate.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS store_credit NUMERIC(10,2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN customers.store_credit IS 'Running store credit balance, maintained by sync_customer_store_credit() trigger on the payments table. Can never go negative.';

ALTER TABLE customers ADD CONSTRAINT chk_store_credit_non_negative CHECK (store_credit >= 0);

-- One-time backfill from existing payment history, using the same signed
-- formula the trigger below applies going forward.
UPDATE customers c SET store_credit = GREATEST(0, COALESCE((
  SELECT SUM(p.amount * CASE WHEN t.total_amount < 0 THEN 1 ELSE -1 END)
  FROM payments p
  JOIN transactions t ON p.transaction_id = t.transaction_id
  WHERE t.customer_id = c.id AND p.payment_method = 'store_credit'
), 0));

-- Keep customers.store_credit in sync with payments rows automatically,
-- regardless of which code path inserts/edits/deletes a payment. A payment
-- on a payable transaction (store owes the customer) issues credit; a
-- payment on a receivable transaction (customer owes the store) redeems it.
-- The balance is clamped at 0 after every single change, not just at the
-- end, matching the "store credit can't be negative" rule as a live invariant.
CREATE OR REPLACE FUNCTION sync_customer_store_credit()
RETURNS TRIGGER AS $$
DECLARE
  old_cust_id INTEGER;
  new_cust_id INTEGER;
  old_total   NUMERIC;
  new_total   NUMERIC;
  delta       NUMERIC;
BEGIN
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.payment_method = 'store_credit' THEN
    SELECT t.customer_id, t.total_amount INTO old_cust_id, old_total
    FROM transactions t WHERE t.transaction_id = OLD.transaction_id;
    IF old_cust_id IS NOT NULL THEN
      delta := OLD.amount * CASE WHEN old_total < 0 THEN 1 ELSE -1 END;
      UPDATE customers SET store_credit = GREATEST(0, store_credit - delta) WHERE id = old_cust_id;
    END IF;
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.payment_method = 'store_credit' THEN
    SELECT t.customer_id, t.total_amount INTO new_cust_id, new_total
    FROM transactions t WHERE t.transaction_id = NEW.transaction_id;
    IF new_cust_id IS NOT NULL THEN
      delta := NEW.amount * CASE WHEN new_total < 0 THEN 1 ELSE -1 END;
      UPDATE customers SET store_credit = GREATEST(0, store_credit + delta) WHERE id = new_cust_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_customer_store_credit ON payments;
CREATE TRIGGER trg_sync_customer_store_credit
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_customer_store_credit();