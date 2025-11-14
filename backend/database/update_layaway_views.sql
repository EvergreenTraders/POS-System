-- Update layaway views to include customer_name
-- Run this file to update existing views with customer information

-- Drop existing views first to allow column structure changes
DROP VIEW IF EXISTS layaway_overdue CASCADE;
DROP VIEW IF EXISTS layaway_past_due CASCADE;
DROP VIEW IF EXISTS layaway_active CASCADE;
DROP VIEW IF EXISTS layaway_no_activity CASCADE;
DROP VIEW IF EXISTS layaway_no_payment_30_days CASCADE;
DROP VIEW IF EXISTS layaway_locate CASCADE;

-- View for layaway overdue report
CREATE VIEW layaway_overdue AS
SELECT
    l.layaway_id,
    l.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    l.item_id,
    l.total_price,
    l.balance_remaining,
    l.next_payment_date,
    l.overdue_days,
    l.last_contact_date,
    l.days_since_contact,
    l.status
FROM layaway l
LEFT JOIN customers c ON l.customer_id = c.id
WHERE l.status = 'OVERDUE'
ORDER BY l.overdue_days DESC;

-- View for past payment due date
CREATE VIEW layaway_past_due AS
SELECT
    l.layaway_id,
    l.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    l.item_id,
    l.total_price,
    l.balance_remaining,
    l.next_payment_date,
    l.overdue_days,
    l.status
FROM layaway l
LEFT JOIN customers c ON l.customer_id = c.id
WHERE l.next_payment_date < CURRENT_DATE
  AND l.status IN ('ACTIVE', 'OVERDUE')
ORDER BY l.next_payment_date ASC;

-- View for all active layaways
CREATE VIEW layaway_active AS
SELECT
    l.layaway_id,
    l.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    l.item_id,
    l.total_price,
    l.amount_paid,
    l.balance_remaining,
    l.next_payment_date,
    l.payment_frequency,
    l.status
FROM layaway l
LEFT JOIN customers c ON l.customer_id = c.id
WHERE l.status = 'ACTIVE'
ORDER BY l.next_payment_date ASC;

-- View for contacted but no activity
CREATE VIEW layaway_no_activity AS
SELECT
    l.layaway_id,
    l.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    l.item_id,
    l.total_price,
    l.balance_remaining,
    l.last_contact_date,
    l.days_since_contact,
    l.last_payment_date,
    l.status
FROM layaway l
LEFT JOIN customers c ON l.customer_id = c.id
WHERE l.last_contact_date IS NOT NULL
  AND l.last_payment_date IS NULL
  AND l.status IN ('ACTIVE', 'OVERDUE')
ORDER BY l.days_since_contact DESC;

-- View for no payment in 30 days
CREATE VIEW layaway_no_payment_30_days AS
SELECT
    l.layaway_id,
    l.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    l.item_id,
    l.total_price,
    l.balance_remaining,
    l.last_payment_date,
    CURRENT_DATE - l.last_payment_date::DATE AS days_since_payment,
    l.status
FROM layaway l
LEFT JOIN customers c ON l.customer_id = c.id
WHERE (CURRENT_DATE - l.last_payment_date::DATE) >= 30
  AND l.status IN ('ACTIVE', 'OVERDUE')
ORDER BY l.last_payment_date ASC;

-- View for locating layaways (quick search)
CREATE VIEW layaway_locate AS
SELECT
    l.layaway_id,
    l.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    l.item_id,
    l.total_price,
    l.balance_remaining,
    l.status,
    l.layaway_date,
    l.next_payment_date
FROM layaway l
LEFT JOIN customers c ON l.customer_id = c.id
ORDER BY l.layaway_date DESC;
