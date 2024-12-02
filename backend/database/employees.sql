DROP TABLE IF EXISTS employees;
-- Create employees table
CREATE TABLE employees (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample employee data
INSERT INTO employees (username, first_name, last_name, email, password, phone, role, hire_date, salary, status) VALUES
('cbaker', 'Chris', 'Baker', 'chris.baker@evergreen.com', 'password123', '555-0101', 'Store Manager', '2022-01-15', 65000.00, 'Active'),
('ejohnson', 'Emily', 'Johnson', 'emily.johnson@evergreen.com', 'password123', '555-0102', 'Sales Associate', '2022-03-20', 42000.00, 'Active'),
('mwilliams', 'Michael', 'Williams', 'michael.williams@evergreen.com', 'password123', '555-0103', 'Jewellery Specialist', '2022-02-10', 48000.00, 'Active'),
('sbrown', 'Sarah', 'Brown', 'sarah.brown@evergreen.com', 'password123', '555-0104', 'Cashier', '2022-04-05', 38000.00, 'Active'),
('djones', 'David', 'Jones', 'david.jones@evergreen.com', 'password123', '555-0105', 'Store Manager', '2022-01-20', 52000.00, 'Active'),
('ldavis', 'Lisa', 'Davis', 'lisa.davis@evergreen.com', 'password123', '555-0106', 'Sales Associate', '2022-05-15', 41000.00, 'Active'),
('trivett', 'Trevor', 'Rivett', 'trevor.rivett@evergreen.com', 'password123', '555-0107', 'Store Owner', '1998-03-01', 47000.00, 'Active'),
('jwilson', 'Jennifer', 'Wilson', 'jennifer.wilson@evergreen.com', 'password123', '555-0108', 'Cashier', '2022-06-10', 37500.00, 'Active'),
('pguntupalli', 'Priya', 'Guntupalli', 'guntupallipriya1998@gmail.com', 'password123', '897-1932', 'Software Developer', '2024-11-14', 43000.00, 'Active'),
('ataylor', 'Amanda', 'Taylor', 'amanda.taylor@evergreen.com', 'password123', '555-0110', 'Sales Associate', '2022-04-20', 41500.00, 'Active');
