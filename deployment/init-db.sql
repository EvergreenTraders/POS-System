-- POS System Database Initialization Script
-- Run this script on your AWS RDS PostgreSQL instance

-- This script will create all necessary tables for the POS system
-- Run it after creating the RDS instance

-- Note: The actual table schemas should be imported from your existing database
-- You can export them using: pg_dump -h localhost -U postgres -d postgres --schema-only > schema.sql

\echo 'Initializing POS System Database...'

-- Execute all schema files
-- Replace these paths with your actual schema files from backend/database/

\i backend/database/employees.sql
\i backend/database/customers.sql
\i backend/database/business_info.sql
\i backend/database/inventory.sql
\i backend/database/transactions.sql
\i backend/database/quotes.sql
\i backend/database/layaway.sql
\i backend/database/scrap.sql
\i backend/database/scrap_history.sql
\i backend/database/item_history.sql
\i backend/database/customer_ticket.sql
\i backend/database/create_customer_account_links.sql
\i backend/database/linked_account_authorization.sql
\i backend/database/tax_config.sql
\i backend/database/system_config.sql
\i backend/database/metal_estimator.sql
\i backend/database/gem_estimator.sql
\i backend/database/jewellery_wp.sql

\echo 'Database initialization complete!'
\echo 'You can now connect your application to this database.'
