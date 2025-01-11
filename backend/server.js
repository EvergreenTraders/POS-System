require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.connect()
  .then(() => console.log('Database connected successfully'))
  .catch(err => {
    console.error('Database connection error:', err.message);
  });

// Authentication route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Check if identifier is email or username
    const query = 'SELECT * FROM employees WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)';
    const userQuery = await pool.query(query, [identifier]);
    
    console.log('Query result rows:', userQuery.rows.length);

    if (userQuery.rows.length === 0) {
      console.log('No user found with identifier:', identifier);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userQuery.rows[0];

    // For debugging: Log password comparison
    const isValidPassword = password === user.password;
    console.log('Password match result:', isValidPassword);

    if (isValidPassword) {
      const token = jwt.sign(
        {
          id: user.employee_id,
          role: user.role,
          username: user.username
        },
        process.env.JWT_SECRET || 'evergreen_jwt_secret_2024',
        { expiresIn: '24h' }
      );

      console.log('Login successful for user:', user.username);

      return res.json({
        token,
        user: {
          id: user.employee_id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name
        }
      });
    } else {
      console.log('Password mismatch for user:', user.username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to POS System API' });
});

// Employee routes
app.get('/api/employees', async (req, res) => {
  try {
    const query = `
      SELECT 
        employee_id,
        username,
        first_name,
        last_name,
        email,
        phone,
        role,
        hire_date,
        salary,
        status
      FROM employees
      ORDER BY employee_id ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const { username, firstName, lastName, email, password, phone, role, salary } = req.body;
    
    // Check if username or email already exists
    const checkQuery = 'SELECT * FROM employees WHERE username = $1 OR email = $2';
    const checkResult = await pool.query(checkQuery, [username, email]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const query = `
      INSERT INTO employees (
        username, first_name, last_name, email, password, phone, role, 
        hire_date, salary, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, 'Active')
      RETURNING 
        employee_id, username, first_name, last_name, email, phone, role, 
        hire_date, salary, status
    `;
    const result = await pool.query(query, [
      username,
      firstName,
      lastName,
      email,
      password,
      phone || null,
      role,
      salary
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating employee:', err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, firstName, lastName, email, phone, role, salary, status } = req.body;
    
    // Check if username or email already exists for other employees
    const checkQuery = `
      SELECT * FROM employees 
      WHERE (username = $1 OR email = $2) 
      AND employee_id != $3
    `;
    const checkResult = await pool.query(checkQuery, [username, email, id]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const query = `
      UPDATE employees 
      SET username = $1, first_name = $2, last_name = $3, 
          email = $4, phone = $5, role = $6, salary = $7,
          status = $8, updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $9
      RETURNING 
        employee_id, username, first_name, last_name, email, phone, role,
        hire_date, salary, status
    `;
    const result = await pool.query(query, [
      username,
      firstName,
      lastName,
      email,
      phone || null,
      role,
      salary,
      status,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM employees WHERE employee_id = $1 RETURNING employee_id';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Error deleting employee:', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
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

// Precious Metal tables routes
app.get('/api/precious_metal_type', async (req, res) => {
  try {
    const query = 'SELECT * FROM precious_metal_type';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching precious metal types:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Non Precious Metal tables routes
app.get('/api/non_precious_metal_type', async (req, res) => {
  try {
    const query = 'SELECT * FROM non_precious_metal_type';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching non-precious metal types:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Metal tables routes
app.get('/api/metal_type', async (req, res) => {
  try {
    const query = 'SELECT * FROM metal_type';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching metal types:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/metal_purity/:precious_metal_type_id', async (req, res) => {
  try {
    const { precious_metal_type_id } = req.params;
    
    const query = 'SELECT * FROM metal_purity WHERE precious_metal_type_id = $1';
    const result = await pool.query(query, [precious_metal_type_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No purities found for this metal type' });
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching metal purities:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/metal_category', async (req, res) => {
  try {
    const query = 'SELECT * FROM metal_category';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching metal categories:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/metal_color', async (req, res) => {
  try {
    const query = 'SELECT * FROM metal_color';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching metal colors:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/metal_style_category', async (req, res) => {
  try {
    const query = 'SELECT * FROM metal_style_category';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching metal style categories:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/metal_style_subcategory', async (req, res) => {
  try {
    const query = 'SELECT * FROM metal_style_subcategory';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching metal style subcategories:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Diamond Shapes API Endpoint
app.get('/api/diamond_shape', async (req, res) => {
  try {
    const result = await pool.query('SELECT shape, description, image_path FROM diamond_shape');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching diamond shapes:', error);
    res.status(500).json({ error: 'Failed to fetch diamond shapes' });
  }
});

// Diamond Clarity API Endpoint
app.get('/api/diamond_clarity', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, image_path FROM diamond_clarity');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching diamond clarity:', error);
    res.status(500).json({ error: 'Failed to fetch diamond clarity' });
  }
});

// Diamond Size API Endpoint
app.get('/api/diamond_size_weight/:diamond_shape_id', async (req, res) => {
  try {
    const { diamond_shape_id } = req.params;
    
    const query = `
      SELECT size, weight 
      FROM diamond_size_weight 
      WHERE diamond_shape_id = $1 
    `;
    const result = await pool.query(query, [diamond_shape_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No sizes found for this diamond shape' });
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching diamond sizes:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch Diamond Cut Grades
app.get('/api/diamond_cut', async (req, res) => {
  try {
    const query = 'SELECT id, name, value FROM diamond_cut';
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No diamond cut grades found' });
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching diamond cut grades:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch Diamond Color Grades
app.get('/api/diamond_color', async (req, res) => {
  try {
    const query = 'SELECT id, name, color, range FROM diamond_color';
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No diamond color grades found' });
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching diamond color grades:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stone Type API Endpoint
app.get('/api/stone_type', async (req, res) => {
  try {
    const result = await pool.query('SELECT type, image_path FROM stone_type');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stone types:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Stone Shape API Endpoint
app.get('/api/stone_shape', async (req, res) => {
  try {
    const result = await pool.query('SELECT shape, image_path FROM stone_shape');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stone shapes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Stone Color API Endpoint
app.get('/api/stone_color', async (req, res) => {
  try {
    const result = await pool.query('SELECT color FROM stone_color');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stone colors:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Price Estimates API Endpoint
app.get('/api/price_estimates', async (req, res) => {
  try {
    const result = await pool.query('SELECT transaction_type, estimate FROM price_estimates');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching price estimates:', error);
    res.status(500).json({ error:'Internal Server Error'});
  }
});

// PUT route for updating price estimates
app.put('/api/price_estimates', async (req, res) => {
  const estimates = req.body.estimates;
  try {
    for (const estimate of estimates) {
      await pool.query(
        'UPDATE price_estimates SET estimate = $1, updated_at = CURRENT_TIMESTAMP WHERE transaction_type = $2',
        [estimate.estimate, estimate.transaction_type]
      );
    }
    res.status(200).json({ message: 'Price estimates updated successfully.' });
  } catch (error) {
    console.error('Error updating price estimates:', error);
    res.status(500).json({ message: 'Failed to update price estimates.' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!', details: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
