require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'pos_db',
  port: 5432,
});

// Test database connection
pool.connect()
  .then(() => console.log('Database connected successfully'))
  .catch(err => {
    console.error('Database connection error:', err.message);
    // Continue running the server even if DB connection fails
  });

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to POS System API' });
});

// Products routes
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Orders routes
app.post('/api/orders', async (req, res) => {
  try {
    const { items, total } = req.body;
    const result = await pool.query(
      'INSERT INTO orders (items, total, created_at) VALUES ($1, $2, NOW()) RETURNING *',
      [items, total]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating order:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
