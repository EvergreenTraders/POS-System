-- Performance optimization indexes for faster queries

-- Customers table indexes (if not already exist)
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(first_name, last_name);

-- Transactions table indexes (if not already exist)
CREATE INDEX IF NOT EXISTS idx_transactions_customer_created ON transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);

-- Transaction items indexes
CREATE INDEX IF NOT EXISTS idx_transaction_items_txn_id ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_item_id ON transaction_items(item_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_txn_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- Analyze tables to update statistics for query planner
ANALYZE customers;
ANALYZE transactions;
ANALYZE transaction_items;
ANALYZE payments;
