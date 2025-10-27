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

-- Customer account links indexes
CREATE INDEX IF NOT EXISTS idx_account_links_composite ON customer_account_links(primary_customer_id, is_active, linked_customer_id);

-- Analyze tables to update statistics for query planner
ANALYZE customers;
ANALYZE transactions;
ANALYZE transaction_items;
ANALYZE payments;
ANALYZE customer_account_links;

-- Show indexes created
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('customers', 'transactions', 'transaction_items', 'payments', 'customer_account_links')
ORDER BY tablename, indexname;
