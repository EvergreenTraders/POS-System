-- Drop old pawn_ticket table if it exists with old structure
DROP TABLE IF EXISTS pawn_ticket CASCADE;

-- Create pawn_ticket table matching buy_ticket and sale_ticket structure
CREATE TABLE IF NOT EXISTS pawn_ticket (
  id SERIAL PRIMARY KEY,
  pawn_ticket_id VARCHAR(50),
  transaction_id VARCHAR(50),
  item_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'PAWN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN pawn_ticket.status IS 'Status of the pawn ticket: PAWN, REDEEMED, FORFEITED';

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
