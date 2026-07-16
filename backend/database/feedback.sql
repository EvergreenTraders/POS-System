-- Employee-submitted feedback (e.g. from store staff testing the software),
-- reviewed by managers/owners in SystemConfig's Feedback tab.
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(employee_id),
    store_id INTEGER REFERENCES stores(store_id),
    message TEXT NOT NULL,
    page VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_store ON feedback(store_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
