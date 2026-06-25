
-- Create pawn_ticket table matching buy_ticket and sale_ticket structure
CREATE TABLE IF NOT EXISTS pawn_ticket (
  id SERIAL PRIMARY KEY,
  pawn_ticket_id VARCHAR(50),
  transaction_id VARCHAR(50),
  item_id VARCHAR(50),
  inventory_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  term_days INTEGER DEFAULT 90,
  interest_rate DECIMAL(5,2) DEFAULT 2.9,
  insurance_rate DECIMAL(5,2) DEFAULT 1.0,
  frequency_days INTEGER DEFAULT 30,
  due_date DATE,
  storage_fee NUMERIC(10,2) DEFAULT 0,
  ticket_note TEXT,
  show_on_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN pawn_ticket.status IS 'Status of the pawn ticket: ACTIVE, REDEEMED, FORFEITED';
COMMENT ON COLUMN pawn_ticket.term_days IS 'Pawn term in days (frozen at ticket creation)';
COMMENT ON COLUMN pawn_ticket.interest_rate IS 'Interest rate percentage (frozen at ticket creation)';
COMMENT ON COLUMN pawn_ticket.insurance_rate IS 'Insurance rate percentage per period (frozen at ticket creation)';
COMMENT ON COLUMN pawn_ticket.frequency_days IS 'Payment frequency in days (frozen at ticket creation)';
COMMENT ON COLUMN pawn_ticket.due_date IS 'Due date for this pawn ticket';

-- Add missing columns to existing pawn_ticket table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pawn_ticket' AND column_name = 'inventory_type'
  ) THEN
    ALTER TABLE pawn_ticket ADD COLUMN inventory_type VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pawn_ticket' AND column_name = 'term_days'
  ) THEN
    ALTER TABLE pawn_ticket ADD COLUMN term_days INTEGER DEFAULT 90;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pawn_ticket' AND column_name = 'interest_rate'
  ) THEN
    ALTER TABLE pawn_ticket ADD COLUMN interest_rate DECIMAL(5,2) DEFAULT 2.9;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pawn_ticket' AND column_name = 'frequency_days'
  ) THEN
    ALTER TABLE pawn_ticket ADD COLUMN frequency_days INTEGER DEFAULT 30;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pawn_ticket' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE pawn_ticket ADD COLUMN due_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pawn_ticket' AND column_name = 'insurance_rate'
  ) THEN
    ALTER TABLE pawn_ticket ADD COLUMN insurance_rate DECIMAL(5,2) DEFAULT 1.0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pawn_ticket' AND column_name = 'storage_fee'
  ) THEN
    ALTER TABLE pawn_ticket ADD COLUMN storage_fee NUMERIC(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pawn_ticket' AND column_name = 'ticket_note'
  ) THEN
    ALTER TABLE pawn_ticket ADD COLUMN ticket_note TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pawn_ticket' AND column_name = 'show_on_receipt'
  ) THEN
    ALTER TABLE pawn_ticket ADD COLUMN show_on_receipt BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pawn_ticket' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE pawn_ticket ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Backfill updated_at from created_at for rows that have none
UPDATE pawn_ticket SET updated_at = created_at WHERE updated_at IS NULL;

-- Auto-update trigger so every INSERT/UPDATE stamps updated_at
CREATE OR REPLACE FUNCTION update_pawn_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pawn_ticket_timestamp ON pawn_ticket;
CREATE TRIGGER update_pawn_ticket_timestamp
  BEFORE UPDATE ON pawn_ticket
  FOR EACH ROW
  EXECUTE FUNCTION update_pawn_ticket_timestamp();

CREATE TABLE IF NOT EXISTS buy_ticket (
  id SERIAL PRIMARY KEY,
  buy_ticket_id VARCHAR(50),
  transaction_id VARCHAR(50),
  item_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_ticket (
  id SERIAL PRIMARY KEY,
  sale_ticket_id VARCHAR(50),
  transaction_id VARCHAR(50),
  item_id VARCHAR(50),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add quantity column to existing sale_ticket table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sale_ticket' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE sale_ticket ADD COLUMN quantity INTEGER DEFAULT 1;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pawn_ticket_pawn_ticket_id ON pawn_ticket(pawn_ticket_id);
CREATE INDEX IF NOT EXISTS idx_pawn_ticket_transaction_id ON pawn_ticket(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pawn_ticket_item_id ON pawn_ticket(item_id);

CREATE INDEX IF NOT EXISTS idx_buy_ticket_buy_ticket_id ON buy_ticket(buy_ticket_id);
CREATE INDEX IF NOT EXISTS idx_buy_ticket_transaction_id ON buy_ticket(transaction_id);
CREATE INDEX IF NOT EXISTS idx_buy_ticket_item_id ON buy_ticket(item_id);

CREATE INDEX IF NOT EXISTS idx_sale_ticket_sale_ticket_id ON sale_ticket(sale_ticket_id);
CREATE INDEX IF NOT EXISTS idx_sale_ticket_transaction_id ON sale_ticket(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sale_ticket_item_id ON sale_ticket(item_id);
