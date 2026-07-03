-- Parked workspaces: saved mid-transaction workspace state that another employee can resume.
-- Employee A parks (intake counter), Employee B resumes and completes checkout (cash counter).
CREATE TABLE IF NOT EXISTS parked_workspaces (
  id                    SERIAL PRIMARY KEY,
  customer_id           INTEGER,
  workspace_data        JSONB NOT NULL DEFAULT '[]',
  parked_by_employee_id INTEGER,
  store_id              INTEGER,
  parked_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parked_workspaces_store_id ON parked_workspaces(store_id);
CREATE INDEX IF NOT EXISTS idx_parked_workspaces_parked_at ON parked_workspaces(parked_at);
