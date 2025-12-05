-- Create pawn_ticket table
CREATE TABLE IF NOT EXISTS pawn_ticket (
  id SERIAL PRIMARY KEY,
  item_image BYTEA,
  item_description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
CREATE INDEX IF NOT EXISTS idx_buy_ticket_buy_ticket_id ON buy_ticket(buy_ticket_id);
CREATE INDEX IF NOT EXISTS idx_buy_ticket_transaction_id ON buy_ticket(transaction_id);
CREATE INDEX IF NOT EXISTS idx_buy_ticket_item_id ON buy_ticket(item_id);

CREATE INDEX IF NOT EXISTS idx_sale_ticket_sale_ticket_id ON sale_ticket(sale_ticket_id);
CREATE INDEX IF NOT EXISTS idx_sale_ticket_transaction_id ON sale_ticket(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sale_ticket_item_id ON sale_ticket(item_id);
