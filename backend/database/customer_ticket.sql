-- Create pawn_ticket table
CREATE TABLE IF NOT EXISTS pawn_ticket (
  id SERIAL PRIMARY KEY,
  item_image BYTEA,
  item_description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create buy_ticket table
CREATE TABLE IF NOT EXISTS buy_ticket (
  id SERIAL PRIMARY KEY,
  item_image BYTEA,
  item_description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);