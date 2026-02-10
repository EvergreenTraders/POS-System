-- Drop transaction_status column from transactions table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'transactions'
        AND column_name = 'transaction_status'
    ) THEN
        -- Drop the check constraint first
        ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_transaction_status;
        -- Then drop the column
        ALTER TABLE transactions DROP COLUMN transaction_status;
    END IF;
END $$;

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    method_name VARCHAR(50) NOT NULL UNIQUE,
    method_value VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default payment methods
INSERT INTO payment_methods (method_name, method_value) VALUES
    ('Cash', 'cash'),
    ('Credit Card', 'credit_card'),
    ('Debit Card', 'debit_card'),
    ('Check', 'check'),
    ('Gift Card', 'gift_card'),
    ('Store Credit', 'store_credit')
ON CONFLICT (method_value) DO NOTHING;

-- Add is_physical column to payment_methods table
-- Physical tenders are kept in the drawer (cash, checks, gift cards)
-- Non-physical (electronic) tenders are credit/debit cards, store credit, etc.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payment_methods' AND column_name = 'is_physical'
    ) THEN
        ALTER TABLE payment_methods ADD COLUMN is_physical BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Set is_physical flag for each payment method
UPDATE payment_methods SET is_physical = true WHERE method_value IN ('cash', 'check', 'gift_card');
UPDATE payment_methods SET is_physical = false WHERE method_value IN ('credit_card', 'debit_card', 'store_credit');

COMMENT ON COLUMN payment_methods.is_physical IS 'Whether this payment method results in physical tender in the drawer (cash, checks, gift cards) vs electronic (credit cards, debit cards)';

-- Add is_default_cash column to mark the default cash that tracks denominations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payment_methods' AND column_name = 'is_default_cash'
    ) THEN
        ALTER TABLE payment_methods ADD COLUMN is_default_cash BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Set the default cash (method_value = 'cash') as the default cash that tracks denominations
UPDATE payment_methods SET is_default_cash = true WHERE method_value = 'cash';

COMMENT ON COLUMN payment_methods.is_default_cash IS 'Whether this is the default cash payment method that tracks denominations. Only one payment method can be the default cash.';

-- Create transaction_type table
CREATE TABLE IF NOT EXISTS transaction_type (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert transaction types
INSERT INTO transaction_type (type) VALUES
    ('pawn'),
    ('buy'),
    ('retail'),
    ('sale'),
    ('refund'),
    ('return'),
    ('repair'),
    ('payment'),
    ('redeem')
ON CONFLICT (type) DO NOTHING;

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) NOT NULL,
    customer_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    session_id INTEGER,
    total_amount DECIMAL(10,2) NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_transaction_id UNIQUE (transaction_id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (session_id) REFERENCES cash_drawer_sessions(session_id)
);

-- Create transaction_items table to link transactions with items
CREATE TABLE IF NOT EXISTS transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) NOT NULL,
    item_id VARCHAR(50),
    transaction_type_id INTEGER NOT NULL,
    item_price DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
    FOREIGN KEY (item_id) REFERENCES jewelry(item_id),
    FOREIGN KEY (transaction_type_id) REFERENCES transaction_type(id)
);

-- Drop old unique constraint if it exists and create conditional unique constraint
-- Only enforce uniqueness when item_id is not null
ALTER TABLE transaction_items DROP CONSTRAINT IF EXISTS unique_transaction_item;
CREATE UNIQUE INDEX IF NOT EXISTS unique_transaction_item_idx ON transaction_items(item_id) WHERE item_id IS NOT NULL;

-- Create index on transaction_id (non-unique)
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);

-- Create payments table after transactions
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id)
);

-- Add action column to payments table
DO $$
BEGIN
    ALTER TABLE IF EXISTS payments
        ADD COLUMN IF NOT EXISTS action VARCHAR(10) NOT NULL DEFAULT 'in' CHECK (action IN ('in', 'out', 'transfer'));

    -- Add comment to explain the column
    COMMENT ON COLUMN payments.action IS 'Type of payment flow: in (receiving money), out (paying money), or transfer (moving money between accounts)';
END $$;

-- Drop the old payment_method constraint if it exists
ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS chk_payment_method;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_item_id ON transaction_items(item_id);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_transactions_timestamp ON transactions;
CREATE TRIGGER update_transactions_timestamp
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_payments_timestamp ON payments;
CREATE TRIGGER update_payments_timestamp
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_transaction_items_timestamp ON transaction_items;
CREATE TRIGGER update_transaction_items_timestamp
    BEFORE UPDATE ON transaction_items
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_transaction_type_timestamp ON transaction_type;
CREATE TRIGGER update_transaction_type_timestamp
    BEFORE UPDATE ON transaction_type
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_payment_methods_timestamp ON payment_methods;
CREATE TRIGGER update_payment_methods_timestamp
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Add session_id column to transactions table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'transactions'
        AND column_name = 'session_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN session_id INTEGER;
        ALTER TABLE transactions ADD CONSTRAINT fk_transactions_session
            FOREIGN KEY (session_id) REFERENCES cash_drawer_sessions(session_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_session_id ON transactions(session_id);
    END IF;
END $$;