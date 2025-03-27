require('dotenv').config({ path: '../.env' });
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

// Function to update quote days remaining
const updateQuoteDaysRemaining = async () => {
  try {
    await pool.query('SELECT update_quotes_days_remaining()');
    console.log('Updated quote days remaining successfully');
  } catch (error) {
    console.error('Error updating quote days remaining:', error);
  }
};

// Function to update inventory hold status
const updateInventoryHoldStatus = async () => {
  try {
    // Get the current hold period configuration
    const configResult = await pool.query('SELECT days FROM inventory_hold_period ORDER BY created_at DESC LIMIT 1');
    if (configResult.rows.length === 0) {
      console.log('No inventory hold period configuration found');
      return;
    }

    const holdPeriod = configResult.rows[0].days;

    // Update inventory status for items that have exceeded their hold period
    const updateQuery = `
      WITH expired_holds AS (
        SELECT transaction_id 
        FROM transactions 
        WHERE inventory_status = 'HOLD'
        AND created_at < NOW() - INTERVAL '1 day' * $1
      )
      UPDATE transactions t
      SET 
        inventory_status = 'AVAILABLE',
        updated_at = CURRENT_TIMESTAMP
      FROM expired_holds e
      WHERE t.transaction_id = e.transaction_id
      RETURNING t.transaction_id;
    `;
    const result = await pool.query(updateQuery, [holdPeriod]);
    if (result.rows.length > 0) {
      const formattedIds = result.rows.map(r => r.transaction_id).join(', ');
      console.log(`[${new Date().toISOString()}] Updated inventory status to AVAILABLE for transactions: ${formattedIds}`);
      console.log(`Hold period of ${holdPeriod} days exceeded for ${result.rows.length} item(s)`);
    }
  } catch (error) {
    console.error('Error updating inventory hold status:', error);
  }
};

// Schedule daily update of quote days remaining and inventory hold status (runs at midnight)
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    updateQuoteDaysRemaining();
    updateInventoryHoldStatus();
  }
}, 60000); // Check every minute

// Run initial updates when server starts
updateQuoteDaysRemaining();
updateInventoryHoldStatus();

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

// Metal Purity routes
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

// Metal Category routes
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

// Metal Color routes
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

// Metal Style Category routes
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

// Metal Style Subcategory routes
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
    const result = await pool.query('SELECT * FROM stone_color');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stone colors:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Stone types route
app.get('/api/stone_types', async (req, res) => {
  try {
    const query = 'SELECT * FROM stone_types ORDER BY id ASC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stone types:', err);
    res.status(500).json({ error: 'Failed to fetch stone types' });
  }
});

// Diamond Estimates API Endpoint
app.get('/api/diamond_estimates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM diamond_estimates');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching diamond estimates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT route for updating diamond estimates
app.put('/api/diamond_estimates', async (req, res) => {
  try {
    const { transaction_type, estimate } = req.body;
    const result = await pool.query(
      'UPDATE diamond_estimates SET estimate = $2, updated_at = CURRENT_TIMESTAMP WHERE transaction_type = $1 RETURNING *',
      [transaction_type, estimate]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error updating diamond estimates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User preferences API Endpoint
app.get('/api/user_preferences', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_preferences');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT route for updating user preferences
app.put('/api/user_preferences', async (req, res) => {
  try {
    const { name, value } = req.body;
    const result = await pool.query(
      'UPDATE user_preferences SET preference_value = $2 WHERE preference_name = $1 RETURNING *',
      [name, value]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Live Pricing API Endpoint
app.get('/api/live_pricing', async (req, res) => {
  try {
    const result = await pool.query('SELECT islivepricing,per_day,per_transaction FROM live_pricing LIMIT 1');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching live pricing:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT route for updating live pricing
app.put('/api/live_pricing', async (req, res) => {
  try {
    const { isLivePricing, per_day, per_transaction } = req.body;
    
    // Update the live pricing in the database
    const result = await pool.query('UPDATE live_pricing SET islivepricing = $1, per_day = $2, per_transaction = $3', [isLivePricing, per_day, per_transaction]);
    
    res.json({ message: 'Live pricing updated successfully' });
  } catch (error) {
    console.error('Error updating live pricing:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Live Spot Prices API Endpoint
app.get('/api/live_spot_prices', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM live_spot_prices');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching live spot prices:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT route for updating live spot prices
app.put('/api/live_spot_prices', async (req, res) => {
  try {
    const { CADXAG, CADXAU, CADXPD, CADXPT, last_fetched } = req.body;
    
    // Update the price
    await pool.query('UPDATE live_spot_prices SET CADXAG = $1, CADXAU = $2, CADXPD = $3, CADXPT = $4, last_fetched = $5', [CADXAG, CADXAU, CADXPD, CADXPT, last_fetched]);
    res.json({ message: 'Spot prices updated successfully' });
  } catch (error) {
    console.error('Error updating live spot price:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Spot Prices API Endpoint
app.get('/api/spot_prices', async (req, res) => {
  try {
    const result = await pool.query('SELECT precious_metal_type_id, spot_price FROM spot_prices');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching spot prices:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT route for updating spot prices
app.put('/api/spot_prices', async (req, res) => {
  try {
    const { precious_metal_type_id, spot_price } = req.body;
    
    // Update the price
    const updateQuery = 'UPDATE spot_prices SET spot_price = $1 WHERE precious_metal_type_id = $2';
    await pool.query(updateQuery, [spot_price, precious_metal_type_id]);
    
    res.status(200).json({ message: 'Price updated successfully' });
  } catch (error) {
    console.error('Error updating spot price:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Price Estimates API Endpoint
app.get('/api/price_estimates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM price_estimates');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching price estimates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT route for updating price estimates
app.put('/api/price_estimates', async (req, res) => {
  const { precious_metal_type_id, estimates } = req.body;
  try {
    for (const estimate of estimates) {
      await pool.query(
        'UPDATE price_estimates SET estimate = $1, updated_at = CURRENT_TIMESTAMP WHERE precious_metal_type_id = $2 AND transaction_type = $3',
        [estimate.estimate, precious_metal_type_id, estimate.transaction_type]
      );
    }
    res.status(200).json({ message: 'Price estimates updated successfully.' });
  } catch (error) {
    console.error('Error updating price estimates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Carat to Gram Conversion API Endpoints
app.get('/api/carat-conversion', async (req, res) => {
  try {
    const query = 'SELECT * FROM carat_to_gram_conversion';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching carat conversion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/carat-conversion', async (req, res) => {
  try {
    const { grams } = req.body;
    
    const query = 'UPDATE carat_to_gram_conversion SET grams = $1, updated_at = CURRENT_TIMESTAMP RETURNING *';
    const result = await pool.query(query, [grams]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversion record not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating carat conversion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Quote Management API Endpoints
app.post('/api/quotes', async (req, res) => {
  const client = await pool.connect();
  try {
    const { item_id, customer_id, employee_id } = req.body;
    
    // Validate required fields
    if (!item_id || !customer_id || !employee_id) {
      return res.status(400).json({ error: 'item_id, customer_id, and employee_id are required' });
    }

    await client.query('BEGIN');
    
    // Get current expiration configuration
    const configResult = await client.query(`
      SELECT days 
      FROM quote_expiration 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    const expires_in = configResult.rows.length > 0 ? configResult.rows[0].days : 30;
    
    // Insert into quotes table
    const quoteQuery = `
      INSERT INTO quotes (
        item_id,
        customer_id,
        employee_id,
        expires_in,
        created_at
      )
      VALUES ($1, $2, $3, $5, CURRENT_TIMESTAMP)
      RETURNING *`;
    
    const quoteResult = await client.query(quoteQuery, [
      item_id,
      customer_id,
      employee_id,
      expires_in
    ]);

    await client.query('COMMIT');
    res.status(201).json(quoteResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving quote:', err);
    res.status(500).json({ 
      error: 'Failed to save quote', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    client.release();
  }
});

app.get('/api/quotes', async (req, res) => {
  try {
    const query = `
      SELECT 
        q.*,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        j.short_desc as item_description,
        j.buy_price,
        j.pawn_value,
        j.retail_price
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN jewelry j ON q.item_id = j.item_id
      ORDER BY q.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching quotes:', err);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

app.get('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM quotes WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching quote:', err);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

app.put('/api/quotes/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { transaction_type } = req.body;

    // Update only the transaction_type in quotes table
    const updateQuoteQuery = `
      UPDATE quotes 
      SET 
        transaction_type = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    await client.query(updateQuoteQuery, [transaction_type, id]);

    // Then fetch the updated quote with all related information
    const getUpdatedQuoteQuery = `
      SELECT 
        q.*,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        j.short_desc as item_description,
        j.buy_price,
        j.pawn_value,
        j.retail_price
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN jewelry j ON q.item_id = j.item_id
      WHERE q.id = $1
    `;
    const result = await client.query(getUpdatedQuoteQuery, [id]);

    await client.query('COMMIT');

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Quote not found' });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating quote:', err);
    res.status(500).json({ error: 'Failed to update quote', details: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM quotes WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    res.json({ message: 'Quote deleted successfully' });
  } catch (err) {
    console.error('Error deleting quote:', err);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

// Jewelry price update endpoint
app.put('/api/jewelry/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { buy_price, pawn_value, retail_price } = req.body;

    const updateQuery = `
      UPDATE jewelry 
      SET 
        buy_price = $1,
        pawn_value = $2,
        retail_price = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE item_id = $4
      RETURNING *
    `;

    const result = await client.query(updateQuery, [
      buy_price,
      pawn_value,
      retail_price,
      id
    ]);

    await client.query('COMMIT');

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Jewelry item not found' });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating jewelry prices:', err);
    res.status(500).json({ error: 'Failed to update jewelry prices', details: err.message });
  } finally {
    client.release();
  }
});

// Quote Expiration Configuration API Endpoints
app.get('/api/quote-expiration/config', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        *
      FROM quote_expiration 
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No quote expiration configuration found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching quote expiration config:', err);
    res.status(500).json({ error: 'Failed to fetch quote expiration configuration' });
  }
});

app.put('/api/quote-expiration/config', async (req, res) => {
  const client = await pool.connect();
  try {
    const { days } = req.body;
    
    if (!days || days < 1) {
      return res.status(400).json({ error: 'Days must be a positive number' });
    }

    await client.query('BEGIN');

    // Update configuration or insert if none exists
    const updateResult = await client.query(`
      UPDATE quote_expiration
      SET days = $1, updated_at = CURRENT_TIMESTAMP
      RETURNING days, created_at, updated_at
    `, [days]);

    // If no rows were updated, insert new configuration
    let result;
    if (updateResult.rowCount === 0) {
      result = await client.query(`
        INSERT INTO quote_expiration (days)
        VALUES ($1)
        RETURNING id, days, created_at, updated_at
      `, [days]);
    } else {
      result = updateResult;
    }

    // Note: We no longer update existing quotes' expires_in value
    // New quotes will use this configuration when created

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating quote expiration config:', err);
    res.status(500).json({ error: 'Failed to create quote expiration configuration' });
  } finally {
    client.release();
  }
});

// Inventory Hold Period Configuration API Endpoints
app.get('/api/inventory-hold-period/config', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_hold_period ORDER BY created_at DESC LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No inventory hold period configuration found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching inventory hold period config:', err);
    res.status(500).json({ error: 'Failed to fetch inventory hold period configuration' });
  }
});

app.put('/api/inventory-hold-period/config', async (req, res) => {
  const client = await pool.connect();
  try {
    const { days } = req.body;

    await client.query('BEGIN');

    // Update configuration or insert if none exists
    const updateResult = await client.query(`
      UPDATE inventory_hold_period
      SET days = $1
      RETURNING *
    `, [days]);

    // If no rows were updated, insert new configuration
    let result;
    if (updateResult.rowCount === 0) {
      result = await client.query(`
        INSERT INTO inventory_hold_period (days)
        VALUES ($1)
        RETURNING *
      `, [days]);
    } else {
      result = updateResult;
    }

    // Update any inventory items that should no longer be on hold
    await client.query(`
      UPDATE transactions 
      SET inventory_status = 'AVAILABLE' 
      WHERE inventory_status = 'HOLD' 
      AND created_at < NOW() - INTERVAL '1 day' * $1
    `, [days]);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating inventory hold period config:', err);
    res.status(500).json({ error: 'Failed to create inventory hold period configuration' });
  } finally {
    client.release();
  }
});

// Customer routes
// app.get('api/customers', async (req, res) => {
//   const client = await pool.connect();
//   try {
//     const result = await pool.query(
//       'SELECT *, TO_CHAR(date_of_birth, \'YYYY-MM-DD\') as date_of_birth, TO_CHAR(id_expiry_date, \'YYYY-MM-DD\') as id_expiry_date FROM customers ORDER BY created_at DESC'
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error('Error fetching customers:', err);
//     res.status(500).json({ error: 'Failed to fetch customers' });
//   }
// });

app.get('/api/customers/search', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { firstName, lastName, phone } = req.query;
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (firstName) {
      query += ` AND LOWER(first_name) LIKE $${paramCount}`;
      params.push(`%${firstName.toLowerCase()}%`);
      paramCount++;
    }

    if (lastName) {
      query += ` AND LOWER(last_name) LIKE $${paramCount}`;
      params.push(`%${lastName.toLowerCase()}%`);
    }

    if (phone) {
      query += ` AND LOWER(phone) LIKE $${paramCount}`;
      params.push(`%${phone}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await client.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error searching customers:', err);
    res.status(500).json({ error: 'Failed to search customers' });
  } finally {
    client.release();
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT *, TO_CHAR(date_of_birth, \'YYYY-MM-DD\') as date_of_birth, TO_CHAR(id_expiry_date, \'YYYY-MM-DD\') as id_expiry_date FROM customers WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

app.post('/api/customers', async (req, res) => {
  console.log("req.body", authenticateToken);
  try {
    const {
      first_name, last_name, email, phone,
      address_line1, address_line2, city, state, postal_code, country,
      id_type, id_number, id_expiry_date, id_issuing_authority,
      date_of_birth, status, risk_level, notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO customers (
        first_name, last_name, email, phone,
        address_line1, address_line2, city, state, postal_code, country,
        id_type, id_number, id_expiry_date, id_issuing_authority,
        date_of_birth, status, risk_level, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *, TO_CHAR(date_of_birth, 'YYYY-MM-DD') as date_of_birth, TO_CHAR(id_expiry_date, 'YYYY-MM-DD') as id_expiry_date`,
      [first_name, last_name, email, phone,
       address_line1, address_line2, city, state, postal_code, country,
       id_type, id_number, id_expiry_date, id_issuing_authority,
       date_of_birth, status, risk_level, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating customer:', err);
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name, last_name, email, phone,
      address_line1, address_line2, city, state, postal_code, country,
      id_type, id_number, id_expiry_date, id_issuing_authority,
      date_of_birth, status, risk_level, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE customers SET
        first_name = $1, last_name = $2, email = $3, phone = $4,
        address_line1 = $5, address_line2 = $6, city = $7, state = $8,
        postal_code = $9, country = $10, id_type = $11, id_number = $12,
        id_expiry_date = $13, id_issuing_authority = $14, date_of_birth = $15,
        status = $16, risk_level = $17, notes = $18
      WHERE id = $19
      RETURNING *, TO_CHAR(date_of_birth, 'YYYY-MM-DD') as date_of_birth, TO_CHAR(id_expiry_date, 'YYYY-MM-DD') as id_expiry_date`,
      [first_name, last_name, email, phone,
       address_line1, address_line2, city, state, postal_code, country,
       id_type, id_number, id_expiry_date, id_issuing_authority,
       date_of_birth, status, risk_level, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating customer:', err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }
});

// Transaction routes
app.get('/api/transactions', async (req, res) => {
  try {
    const query = `
      SELECT 
        t.*,
        COALESCE(json_agg(
          json_build_object(
            'id', ti.id,
            'image_url', ti.image_url,
            'is_primary', ti.is_primary
          )
        ) FILTER (WHERE ti.id IS NOT NULL), '[]') as images,
        CAST(t.price AS FLOAT) as price,
        TO_CHAR(t.created_at, 'YYYY-MM-DD') as created_date
      FROM transactions t
      LEFT JOIN transaction_images ti ON t.id = ti.transaction_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.get('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get transaction details
    const transactionQuery = `
      SELECT 
        t.id,
        t.transaction_id,
        t.customer_id,
        t.transaction_type,
        t.estimated_value,
        t.metal_purity,
        t.weight,
        t.category,
        t.metal_type,
        t.primary_gem,
        t.secondary_gem,
        t.price,
        t.payment_method,
        t.inventory_status,
        t.created_at,
        c.first_name,
        c.last_name,
        c.email,
        c.phone
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE t.id = $1
    `;
    
    const imagesQuery = `
      SELECT id, image_url, is_primary, created_at
      FROM transaction_images
      WHERE transaction_id = $1
      ORDER BY is_primary DESC, created_at ASC
    `;

    const [transactionResult, imagesResult] = await Promise.all([
      pool.query(transactionQuery, [id]),
      pool.query(imagesQuery, [id])
    ]);
    
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Combine transaction with its images
    const transaction = transactionResult.rows[0];
    transaction.images = imagesResult.rows;
    
    res.json(transaction);
  } catch (err) {
    console.error('Error fetching transaction:', err);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Function to generate transaction ID
async function generateTransactionId(maxAttempts = 10) {
  const prefix = 'TSD';  
  let attempts = 0;
  let isUnique = false;
  let transactionId;

  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    // Generate a random 6-digit number
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    transactionId = `${prefix}${randomNum}`;

    try {
      // Check if this ID already exists in the database
      const checkQuery = 'SELECT COUNT(*) FROM transactions WHERE transaction_id = $1';
      const result = await pool.query(checkQuery, [transactionId]);
      
      if (result.rows[0].count === '0') {
        isUnique = true;
      }
    } catch (err) {
      console.error('Error checking transaction ID uniqueness:', err);
      throw new Error('Failed to generate unique transaction ID');
    }
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique transaction ID after maximum attempts');
  }

  return transactionId;
}

app.post('/api/transactions', async (req, res) => {
  try {
    const {
      customer_id,
      transaction_type,
      estimated_value,
      metal_purity,
      weight,
      category,
      metal_type,
      primary_gem,
      secondary_gem,
      price,
      payment_method,
      inventory_status,
      images // Array of {url, isPrimary} objects
    } = req.body;

    // Required fields validation
    if (!customer_id || !transaction_type || !estimated_value || !price || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique transaction ID
    let transactionId;
    try {
      transactionId = await generateTransactionId();
    } catch (err) {
      console.error('Transaction ID generation error:', err);
      return res.status(500).json({ error: 'Failed to generate transaction ID', details: err.message });
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert transaction
      const transactionQuery = `
        INSERT INTO transactions (
          transaction_id,
          customer_id,
          transaction_type,
          estimated_value,
          metal_purity,
          weight,
          category,
          metal_type,
          primary_gem,
          secondary_gem,
          price,
          payment_method,
          inventory_status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
        RETURNING 
          id,
          transaction_id,
          customer_id,
          transaction_type,
          estimated_value,
          metal_purity,
          weight,
          category,
          metal_type,
          primary_gem,
          secondary_gem,
          price,
          payment_method,
          inventory_status,
          created_at
      `;

      const transactionResult = await client.query(transactionQuery, [
        transactionId,
        customer_id,
        transaction_type,
        estimated_value,
        metal_purity,
        weight,
        category,
        metal_type,
        primary_gem,
        secondary_gem,
        price,
        payment_method,
        'HOLD'
      ]);

      const transaction = transactionResult.rows[0];

      // Save images if provided
      let savedImages = [];
      if (images && images.length > 0) {
        const imageQuery = `
          INSERT INTO transaction_images (
            transaction_id, 
            image_url, 
            is_primary
          )
          VALUES ($1, $2, $3)
          RETURNING id, image_url, is_primary
        `;

        // Ensure only one primary image
        const hasPrimary = images.some(img => img.isPrimary);
        savedImages = await Promise.all(
          images.map((img, index) => {
            // If no primary image was specified, make the first image primary
            const isPrimary = img.isPrimary || (!hasPrimary && index === 0);
            return client.query(imageQuery, [
              transaction.id,
              img.url,
              isPrimary
            ]).then(result => result.rows[0]);
          })
        );
      }

      await client.query('COMMIT');

      // Return transaction with images
      res.status(201).json({
        ...transaction,
        images: savedImages
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Error creating transaction:', err);
    res.status(500).json({ error: 'Failed to create transaction', details: err.message });
  }
});

app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      transaction_type,
      estimated_value,
      metal_purity,
      weight,
      category,
      metal_type,
      primary_gem,
      secondary_gem,
      price,
      payment_method,
      inventory_status
    } = req.body;

    // First check if transaction exists
    const checkQuery = 'SELECT * FROM transactions WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const query = `
      UPDATE transactions 
      SET 
        transaction_type = COALESCE($1, transaction_type),
        estimated_value = COALESCE($2, estimated_value),
        metal_purity = COALESCE($3, metal_purity),
        weight = COALESCE($4, weight),
        category = COALESCE($5, category),
        metal_type = COALESCE($6, metal_type),
        primary_gem = COALESCE($7, primary_gem),
        secondary_gem = COALESCE($8, secondary_gem),
        price = COALESCE($9, price),
        payment_method = COALESCE($10, payment_method),
        inventory_status = COALESCE($11, inventory_status)
      WHERE id = $12
      RETURNING 
        id,
        transaction_id,
        customer_id,
        transaction_type,
        estimated_value,
        metal_purity,
        weight,
        category,
        metal_type,
        primary_gem,
        secondary_gem,
        price,
        payment_method,
        inventory_status,
        created_at
    `;
    
    const result = await pool.query(query, [
      transaction_type,
      estimated_value,
      metal_purity,
      weight,
      category,
      metal_type,
      primary_gem,
      secondary_gem,
      price,
      payment_method,
      inventory_status,
      id
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating transaction:', err);
    res.status(500).json({ error: 'Failed to update transaction', details: err.message });
  }
});

// Transaction Types API Endpoints
app.get('/api/transaction-types', async (req, res) => {
  try {
    const query = 'SELECT * FROM transaction_type ORDER BY id';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transaction types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get jewelry items by prefix
app.get('/api/jewelry/prefix/:prefix', async (req, res) => {
  try {
    const { prefix } = req.params;
    const result = await pool.query(
      "SELECT item_id FROM jewelry WHERE item_id LIKE $1 ORDER BY item_id",
      [`${prefix}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching jewelry items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add jewelry item endpoint
app.post('/api/jewelry', async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('Received cart items:', req.body);
    await client.query('BEGIN');
    
    const { cartItems } = req.body;

    // Process each cart item
    const jewelryItems = await Promise.all(cartItems.map(async item => {
      // Insert jewelry record
      const jewelryQuery = `
        INSERT INTO jewelry (
          item_id,
          long_desc,
          short_desc,
          category,
          brand,
          damages,
          vintage,
          stamps,
          images,
          metal_weight,
          precious_metal_type,
          non_precious_metal_type,
          metal_purity,
          jewelry_color,
          purity_value,
          est_metal_value,
          primary_gem_type,
          primary_gem_category,
          primary_gem_size,
          primary_gem_quantity,
          primary_gem_shape,
          primary_gem_weight,
          primary_gem_color,
          primary_gem_exact_color,
          primary_gem_clarity,
          primary_gem_cut,
          primary_gem_lab_grown,
          primary_gem_authentic,
          primary_gem_value,
          secondary_gem_type,
          secondary_gem_category,
          secondary_gem_size,
          secondary_gem_quantity,
          secondary_gem_shape,
          secondary_gem_weight,
          secondary_gem_color,
          secondary_gem_exact_color,
          secondary_gem_clarity,
          secondary_gem_cut,
          secondary_gem_lab_grown,
          secondary_gem_authentic,
          secondary_gem_value,
          buy_price,
          pawn_value,
          retail_price,
          status,
          location,
          condition,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 
                 $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, 
                 $41, $42, $43, $44, $45, $46, $47, $48, NOW(), NOW())
        RETURNING *`;

      // Map cart item fields to jewelry table fields
      const jewelryValues = [
        item.item_id,                                              // $1
        item.long_desc || '',                                    // $2
        item.short_desc || '',                             // $3
        item.metal_category || '',                                // $4
        item.brand || '',                                         // $5
        item.damages || '',                                       // $6
        item.vintage || false,                                    // $7
        item.stamps || '',                                        // $8
        JSON.stringify(item.images || []),                        // $9
        parseFloat(item.metal_weight) || 0,                       // $10
        item.precious_metal_type || '',                                    // $11
        item.non_precious_metal_type || '',                       // $12
        item.metal_purity || '',                                  // $13
        item.jewelry_color || '',                                 // $14
        parseFloat(item.metal_purity_value) || 0,                // $15
        parseFloat(item.est_metal_value) || 0,                       // $16
        item.primary_gem_type || '',                             // $17
        item.primary_gem_category || '',                      // $18
        item.primary_gem_size || 0,                             // $19
        item.primary_gem_quantity || 0,                // $20
        item.primary_gem_shape || '',                            // $21
        parseFloat(item.primary_gem_weight) || 0,                // $22
        item.primary_gem_color || '',                            // $23
        item.primary_gem_exact_color || '',                      // $24
        item.primary_gem_clarity || '',                          // $25
        item.primary_gem_cut || '',                              // $26
        item.primary_gem_lab_grown || false,                     // $27
        item.primary_gem_authentic || false,                     // $28
        parseFloat(item.primary_gem_value) || 0,                 // $29
        item.secondary_gem_type || '',                           // $30
        item.secondary_gem_category || '',                       // $31
        item.secondary_gem_size || 0,                           // $32
        item.secondary_gem_quantity || 0,              // $33
        item.secondary_gem_shape || '',                          // $34
        parseFloat(item.secondary_gem_weight) || 0,              // $35
        item.secondary_gem_color || '',                          // $36
        item.secondary_gem_exact_color || '',                    // $37
        item.secondary_gem_clarity || '',                        // $38
        item.secondary_gem_cut || '',                            // $39
        item.secondary_gem_lab_grown || false,                   // $40
        item.secondary_gem_authentic || false,                   // $41
        parseFloat(item.secondary_gem_value) || 0,               // $42
        item.buy_price,    // $43
        item.pawn_value,   // $44
        item.retail_price, // $45
        'HOLD',                                                // $46
        'SOUTH STORE',                                                 // $47
        'GOOD'                                                   // $48
      ];

      const result = await client.query(jewelryQuery, jewelryValues);
      return result.rows[0];
    }));

    await client.query('COMMIT');
    res.status(201).json(jewelryItems);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating jewelry items:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
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

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, process.env.JWT_SECRET || 'evergreen_jwt_secret_2024', (err, user) => {
    if (err) return res.status(403).json({ error: 'Access denied. Invalid token.' });
    req.user = user;
    next();
  });
}
