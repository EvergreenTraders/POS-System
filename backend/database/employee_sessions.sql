-- Employee Sessions Table for Clock-In/Clock-Out Tracking
CREATE TABLE IF NOT EXISTS employee_sessions (
    session_id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(employee_id),
    clock_in_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clock_out_time TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'clocked_in' CHECK (status IN ('clocked_in', 'clocked_out')),
    clock_in_notes TEXT,
    clock_out_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_employee_sessions_employee_id ON employee_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_status ON employee_sessions(status);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_clock_in_time ON employee_sessions(clock_in_time);

-- Add comments for documentation
COMMENT ON TABLE employee_sessions IS 'Tracks employee clock-in and clock-out times for time tracking and payroll';
COMMENT ON COLUMN employee_sessions.session_id IS 'Unique identifier for each clock-in/out session';
COMMENT ON COLUMN employee_sessions.employee_id IS 'Foreign key reference to employees table';
COMMENT ON COLUMN employee_sessions.clock_in_time IS 'Timestamp when employee clocked in';
COMMENT ON COLUMN employee_sessions.clock_out_time IS 'Timestamp when employee clocked out (NULL if still clocked in)';
COMMENT ON COLUMN employee_sessions.status IS 'Current status: clocked_in or clocked_out';
COMMENT ON COLUMN employee_sessions.clock_in_notes IS 'Optional notes when clocking in';
COMMENT ON COLUMN employee_sessions.clock_out_notes IS 'Optional notes when clocking out';

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_employee_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp update
DROP TRIGGER IF EXISTS update_employee_sessions_timestamp ON employee_sessions;
CREATE TRIGGER update_employee_sessions_timestamp
    BEFORE UPDATE ON employee_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_sessions_timestamp();
