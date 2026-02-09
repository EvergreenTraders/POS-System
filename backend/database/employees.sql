-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    role VARCHAR(50) NOT NULL,
    hire_date DATE NOT NULL,
    salary DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',

    -- Employee image (stored as binary data)
    image BYTEA,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample employee data
-- Add comments for documentation
COMMENT ON TABLE employees IS 'Stores employee information including profile images';
COMMENT ON COLUMN employees.image IS 'Employee profile photo stored as binary data';

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_employee_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp update
DROP TRIGGER IF EXISTS update_employee_timestamp ON employees;
CREATE TRIGGER update_employee_timestamp
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_timestamp();

-- Insert sample employee data (only if table is empty)
INSERT INTO employees (username, first_name, last_name, email, password, phone, role, hire_date, salary, status)
SELECT
    username, first_name, last_name, email, password, phone, role,
    hire_date::DATE, salary, status
FROM (VALUES
('cbaker', 'Chris', 'Baker', 'chris.baker@evergreen.com', 'password123', '555-0101', 'Store Manager', '2022-01-15', 65000.00, 'Active'),
('ejohnson', 'Emily', 'Johnson', 'emily.johnson@evergreen.com', 'password123', '555-0102', 'Sales Associate', '2022-03-20', 42000.00, 'Active'),
('mwilliams', 'Michael', 'Williams', 'michael.williams@evergreen.com', 'password123', '555-0103', 'Jewellery Specialist', '2022-02-10', 48000.00, 'Active'),
('sbrown', 'Sarah', 'Brown', 'sarah.brown@evergreen.com', 'password123', '555-0104', 'Cashier', '2022-04-05', 38000.00, 'Active'),
('djones', 'David', 'Jones', 'david.jones@evergreen.com', 'password123', '555-0105', 'Store Manager', '2022-01-20', 52000.00, 'Active'),
('ldavis', 'Lisa', 'Davis', 'lisa.davis@evergreen.com', 'password123', '555-0106', 'Sales Associate', '2022-05-15', 41000.00, 'Active'),
('trivett', 'Trevor', 'Rivett', 'trevor.rivett@evergreen.com', 'password123', '555-0107', 'Store Owner', '1998-03-01', 47000.00, 'Active'),
('jwilson', 'Jennifer', 'Wilson', 'jennifer.wilson@evergreen.com', 'password123', '555-0108', 'Cashier', '2022-06-10', 37500.00, 'Active'),
('pguntupalli', 'Priya', 'Guntupalli', 'guntupallipriya1998@gmail.com', 'password123', '897-1932', 'Software Developer', '2024-11-14', 43000.00, 'Active'),
('ataylor', 'Amanda', 'Taylor', 'amanda.taylor@evergreen.com', 'password123', '555-0110', 'Sales Associate', '2022-04-20', 41500.00, 'Active')
) AS v(username, first_name, last_name, email, password, phone, role, hire_date, salary, status)
WHERE NOT EXISTS (SELECT 1 FROM employees LIMIT 1);

-- ALTER TABLE for existing databases (add image column if it doesn't exist)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS image BYTEA;

-- Add discrepancy_threshold column (per-employee threshold for cash drawer discrepancies)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS discrepancy_threshold DECIMAL(10,2) DEFAULT NULL;
COMMENT ON COLUMN employees.discrepancy_threshold IS 'Per-employee cash drawer discrepancy threshold. NULL means use system default.';

-- Add store_id column to link employees to stores
ALTER TABLE employees ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(store_id);
COMMENT ON COLUMN employees.store_id IS 'The store this employee belongs to. NULL means employee can work at any store.';

-- Set store_id = 1 for all existing employees
UPDATE employees SET store_id = 1 WHERE store_id IS NULL;

-- Insert 20 employees for Store 2
INSERT INTO employees (username, first_name, last_name, email, password, phone, role, hire_date, salary, status, store_id)
SELECT username, first_name, last_name, email, password, phone, role, hire_date::DATE, salary, status, store_id
FROM (VALUES
    ('jsmith2', 'John', 'Smith', 'john.smith@store2.com', 'password123', '555-2001', 'Store Manager', '2023-01-10', 62000.00, 'Active', 2),
    ('amartin2', 'Alice', 'Martin', 'alice.martin@store2.com', 'password123', '555-2002', 'Sales Associate', '2023-02-15', 40000.00, 'Active', 2),
    ('rgarcia2', 'Robert', 'Garcia', 'robert.garcia@store2.com', 'password123', '555-2003', 'Jewellery Specialist', '2023-03-20', 47000.00, 'Active', 2),
    ('mlee2', 'Michelle', 'Lee', 'michelle.lee@store2.com', 'password123', '555-2004', 'Cashier', '2023-04-05', 36000.00, 'Active', 2),
    ('dwong2', 'Daniel', 'Wong', 'daniel.wong@store2.com', 'password123', '555-2005', 'Sales Associate', '2023-05-12', 41000.00, 'Active', 2),
    ('kpatel2', 'Kavita', 'Patel', 'kavita.patel@store2.com', 'password123', '555-2006', 'Cashier', '2023-06-18', 37000.00, 'Active', 2),
    ('bthompson2', 'Brian', 'Thompson', 'brian.thompson@store2.com', 'password123', '555-2007', 'Sales Associate', '2023-07-22', 40500.00, 'Active', 2),
    ('nrodriguez2', 'Nancy', 'Rodriguez', 'nancy.rodriguez@store2.com', 'password123', '555-2008', 'Jewellery Specialist', '2023-08-08', 46000.00, 'Active', 2),
    ('schen2', 'Steven', 'Chen', 'steven.chen@store2.com', 'password123', '555-2009', 'Cashier', '2023-09-14', 36500.00, 'Active', 2),
    ('janderson2', 'Jessica', 'Anderson', 'jessica.anderson@store2.com', 'password123', '555-2010', 'Sales Associate', '2023-10-01', 41500.00, 'Active', 2),
    ('mwhite2', 'Mark', 'White', 'mark.white@store2.com', 'password123', '555-2011', 'Assistant Manager', '2023-01-25', 52000.00, 'Active', 2),
    ('lharris2', 'Laura', 'Harris', 'laura.harris@store2.com', 'password123', '555-2012', 'Sales Associate', '2023-02-28', 39500.00, 'Active', 2),
    ('cjackson2', 'Christopher', 'Jackson', 'chris.jackson@store2.com', 'password123', '555-2013', 'Cashier', '2023-03-15', 37500.00, 'Active', 2),
    ('aking2', 'Angela', 'King', 'angela.king@store2.com', 'password123', '555-2014', 'Sales Associate', '2023-04-20', 40000.00, 'Active', 2),
    ('tscott2', 'Timothy', 'Scott', 'timothy.scott@store2.com', 'password123', '555-2015', 'Jewellery Specialist', '2023-05-30', 48000.00, 'Active', 2),
    ('rgreen2', 'Rachel', 'Green', 'rachel.green@store2.com', 'password123', '555-2016', 'Cashier', '2023-06-25', 36000.00, 'Active', 2),
    ('jadams2', 'James', 'Adams', 'james.adams@store2.com', 'password123', '555-2017', 'Sales Associate', '2023-07-10', 41000.00, 'Active', 2),
    ('enelson2', 'Elizabeth', 'Nelson', 'elizabeth.nelson@store2.com', 'password123', '555-2018', 'Cashier', '2023-08-15', 37000.00, 'Active', 2),
    ('phill2', 'Patrick', 'Hill', 'patrick.hill@store2.com', 'password123', '555-2019', 'Sales Associate', '2023-09-05', 40500.00, 'Active', 2),
    ('swright2', 'Samantha', 'Wright', 'samantha.wright@store2.com', 'password123', '555-2020', 'Assistant Manager', '2023-10-12', 51000.00, 'Active', 2)
) AS v(username, first_name, last_name, email, password, phone, role, hire_date, salary, status, store_id)
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE username = 'jsmith2');

-- Insert 20 employees for Store 3
INSERT INTO employees (username, first_name, last_name, email, password, phone, role, hire_date, salary, status, store_id)
SELECT username, first_name, last_name, email, password, phone, role, hire_date::DATE, salary, status, store_id
FROM (VALUES
    ('mclark3', 'Matthew', 'Clark', 'matthew.clark@store3.com', 'password123', '555-3001', 'Store Manager', '2023-01-08', 63000.00, 'Active', 3),
    ('jlewis3', 'Jennifer', 'Lewis', 'jennifer.lewis@store3.com', 'password123', '555-3002', 'Sales Associate', '2023-02-12', 39000.00, 'Active', 3),
    ('dwalker3', 'David', 'Walker', 'david.walker@store3.com', 'password123', '555-3003', 'Jewellery Specialist', '2023-03-18', 46500.00, 'Active', 3),
    ('ahall3', 'Amanda', 'Hall', 'amanda.hall@store3.com', 'password123', '555-3004', 'Cashier', '2023-04-02', 35500.00, 'Active', 3),
    ('ryoung3', 'Richard', 'Young', 'richard.young@store3.com', 'password123', '555-3005', 'Sales Associate', '2023-05-08', 40000.00, 'Active', 3),
    ('kallen3', 'Katherine', 'Allen', 'katherine.allen@store3.com', 'password123', '555-3006', 'Cashier', '2023-06-14', 36500.00, 'Active', 3),
    ('jsanchez3', 'Joseph', 'Sanchez', 'joseph.sanchez@store3.com', 'password123', '555-3007', 'Sales Associate', '2023-07-20', 41000.00, 'Active', 3),
    ('mwright3', 'Megan', 'Wright', 'megan.wright@store3.com', 'password123', '555-3008', 'Jewellery Specialist', '2023-08-05', 47500.00, 'Active', 3),
    ('throberts3', 'Thomas', 'Roberts', 'thomas.roberts@store3.com', 'password123', '555-3009', 'Cashier', '2023-09-10', 37000.00, 'Active', 3),
    ('sturner3', 'Stephanie', 'Turner', 'stephanie.turner@store3.com', 'password123', '555-3010', 'Sales Associate', '2023-10-05', 40500.00, 'Active', 3),
    ('wphillips3', 'William', 'Phillips', 'william.phillips@store3.com', 'password123', '555-3011', 'Assistant Manager', '2023-01-20', 53000.00, 'Active', 3),
    ('ncampbell3', 'Nicole', 'Campbell', 'nicole.campbell@store3.com', 'password123', '555-3012', 'Sales Associate', '2023-02-25', 38500.00, 'Active', 3),
    ('bparker3', 'Brandon', 'Parker', 'brandon.parker@store3.com', 'password123', '555-3013', 'Cashier', '2023-03-12', 36000.00, 'Active', 3),
    ('levans3', 'Lauren', 'Evans', 'lauren.evans@store3.com', 'password123', '555-3014', 'Sales Associate', '2023-04-18', 41500.00, 'Active', 3),
    ('aedwards3', 'Andrew', 'Edwards', 'andrew.edwards@store3.com', 'password123', '555-3015', 'Jewellery Specialist', '2023-05-25', 48500.00, 'Active', 3),
    ('ecollins3', 'Emily', 'Collins', 'emily.collins@store3.com', 'password123', '555-3016', 'Cashier', '2023-06-30', 35000.00, 'Active', 3),
    ('jstewart3', 'Jason', 'Stewart', 'jason.stewart@store3.com', 'password123', '555-3017', 'Sales Associate', '2023-07-15', 40000.00, 'Active', 3),
    ('hmorris3', 'Heather', 'Morris', 'heather.morris@store3.com', 'password123', '555-3018', 'Cashier', '2023-08-22', 36500.00, 'Active', 3),
    ('krogers3', 'Kevin', 'Rogers', 'kevin.rogers@store3.com', 'password123', '555-3019', 'Sales Associate', '2023-09-28', 41000.00, 'Active', 3),
    ('creed3', 'Christina', 'Reed', 'christina.reed@store3.com', 'password123', '555-3020', 'Assistant Manager', '2023-10-15', 52500.00, 'Active', 3)
) AS v(username, first_name, last_name, email, password, phone, role, hire_date, salary, status, store_id)
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE username = 'mclark3');

-- Create index for store_id lookups
CREATE INDEX IF NOT EXISTS idx_employees_store_id ON employees(store_id);
