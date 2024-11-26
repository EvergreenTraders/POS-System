-- Create database
CREATE DATABASE pos_db;

-- Connect to database
\c pos_db;

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    items JSONB NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO products (name, price, stock) VALUES
    ('Product 1', 9.99, 100),
    ('Product 2', 19.99, 50),
    ('Product 3', 29.99, 75);

-- Insert sample order
INSERT INTO orders (items, total, status) VALUES
    ('[{"id": 1, "quantity": 3}]', 29.97, 'Completed'),
    ('[{"id": 2, "quantity": 2}]', 49.98, 'Pending'),
    ('[{"id": 3, "quantity": 5}]', 99.99, 'Completed');
