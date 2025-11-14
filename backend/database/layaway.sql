-- Create layaway table for managing customer layaway plans
CREATE TABLE IF NOT EXISTS layaway (
    layaway_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    item_id VARCHAR(10) NOT NULL,
    employee_id INTEGER,

    -- Pricing and Payment
    total_price DECIMAL(10,2) NOT NULL,
    down_payment DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_remaining DECIMAL(10,2) NOT NULL,

    -- Payment Schedule
    payment_frequency VARCHAR(20) DEFAULT 'WEEKLY', -- WEEKLY, BI_WEEKLY, MONTHLY
    payment_amount DECIMAL(10,2),
    next_payment_date DATE,
    final_payment_date DATE,

    -- Status and Dates
    status VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, OVERDUE, CANCELLED, DEFAULTED
    layaway_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completion_date TIMESTAMP,
    last_payment_date TIMESTAMP,

    -- Contact and Activity
    last_contact_date DATE,
    days_since_contact INTEGER,
    overdue_days INTEGER DEFAULT 0,

    -- Notes and Terms
    notes TEXT,
    terms TEXT,
    late_fee DECIMAL(10,2) DEFAULT 0,
    cancellation_fee DECIMAL(10,2) DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

-- Create layaway payments table to track individual payments
CREATE TABLE IF NOT EXISTS layaway_payments (
    payment_id SERIAL PRIMARY KEY,
    layaway_id INTEGER NOT NULL,
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50), -- CASH, CARD, CHECK, etc.
    notes TEXT,
    received_by INTEGER,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (layaway_id) REFERENCES layaway(layaway_id) ON DELETE CASCADE
);

-- Create layaway history table for tracking changes
CREATE TABLE IF NOT EXISTS layaway_history (
    history_id SERIAL PRIMARY KEY,
    layaway_id INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- CREATED, PAYMENT_MADE, STATUS_CHANGED, CONTACTED, etc.
    action_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    performed_by INTEGER,
    old_value TEXT,
    new_value TEXT,
    notes TEXT,

    FOREIGN KEY (layaway_id) REFERENCES layaway(layaway_id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_layaway_customer_id ON layaway(customer_id);
CREATE INDEX IF NOT EXISTS idx_layaway_status ON layaway(status);
CREATE INDEX IF NOT EXISTS idx_layaway_next_payment_date ON layaway(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_layaway_last_contact_date ON layaway(last_contact_date);
CREATE INDEX IF NOT EXISTS idx_layaway_payments_layaway_id ON layaway_payments(layaway_id);
CREATE INDEX IF NOT EXISTS idx_layaway_history_layaway_id ON layaway_history(layaway_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_layaway_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamps
DROP TRIGGER IF EXISTS trg_update_layaway_timestamp ON layaway;
CREATE TRIGGER trg_update_layaway_timestamp
BEFORE UPDATE ON layaway
FOR EACH ROW
EXECUTE FUNCTION update_layaway_timestamp();

-- Function to calculate days since last contact
CREATE OR REPLACE FUNCTION update_days_since_contact()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_contact_date IS NOT NULL THEN
        NEW.days_since_contact = CURRENT_DATE - NEW.last_contact_date;
    ELSE
        NEW.days_since_contact = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update days since contact
DROP TRIGGER IF EXISTS trg_update_days_since_contact ON layaway;
CREATE TRIGGER trg_update_days_since_contact
BEFORE INSERT OR UPDATE ON layaway
FOR EACH ROW
EXECUTE FUNCTION update_days_since_contact();

-- Function to update overdue days
CREATE OR REPLACE FUNCTION update_overdue_days()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.next_payment_date IS NOT NULL AND CURRENT_DATE > NEW.next_payment_date THEN
        NEW.overdue_days = CURRENT_DATE - NEW.next_payment_date;

        -- Auto-update status to OVERDUE if payment is overdue
        IF NEW.status = 'ACTIVE' AND NEW.overdue_days > 0 THEN
            NEW.status = 'OVERDUE';
        END IF;
    ELSE
        NEW.overdue_days = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update overdue days
DROP TRIGGER IF EXISTS trg_update_overdue_days ON layaway;
CREATE TRIGGER trg_update_overdue_days
BEFORE INSERT OR UPDATE ON layaway
FOR EACH ROW
EXECUTE FUNCTION update_overdue_days();

-- View for layaway overdue report
CREATE OR REPLACE VIEW layaway_overdue AS
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
CREATE OR REPLACE VIEW layaway_past_due AS
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
CREATE OR REPLACE VIEW layaway_active AS
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
CREATE OR REPLACE VIEW layaway_no_activity AS
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
CREATE OR REPLACE VIEW layaway_no_payment_30_days AS
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
CREATE OR REPLACE VIEW layaway_locate AS
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
