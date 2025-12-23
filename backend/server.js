require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  // Only use SSL for production (AWS RDS), not for local development
  ssl: process.env.DB_HOST === 'localhost' ? false : {
    rejectUnauthorized: false
  }
});

// Multer setup for file uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer setup for customer image uploads
const uploadCustomerImage = multer({ storage: multer.memoryStorage() });

// Configure multer for multiple image uploads (customer photo, ID front and back)
const uploadCustomerImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit per file
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'id_image_front', maxCount: 1 },
  { name: 'id_image_back', maxCount: 1 }
]);

// Configure multer for jewelry image uploads (multiple images)
const uploadJewelryImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit per file
}).array('images', 10); // Allow up to 10 images

// Configure multer for single file uploads (business logo, etc.)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

// Ensure upload directories exist
const uploadDir = 'uploads/customers/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const jewelryUploadDir = 'uploads/jewelry/';
if (!fs.existsSync(jewelryUploadDir)) {
  fs.mkdirSync(jewelryUploadDir, { recursive: true });
}

const scrapUploadDir = 'uploads/scrap/';
if (!fs.existsSync(scrapUploadDir)) {
  fs.mkdirSync(scrapUploadDir, { recursive: true });
}

// Configure multer for scrap weight photo uploads
const uploadScrapPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit per file
}).single('weight_photo');

// Function to update quote days remaining
const updateQuoteDaysRemaining = async () => {
  try {
    await pool.query('SELECT update_quotes_days_remaining()');
  } catch (error) {
    console.error('Error updating quote days remaining:', error);
  }
};

// Function to update inventory hold status
async function updateInventoryHoldStatus(holdPeriodDays) {
  const client = await pool.connect();
  try {
    // Update jewelry status for items that have exceeded their hold period
    // Move items from HOLD to IN_PROCESS (not available for sale)
    const updateQuery = `
      UPDATE jewelry
      SET status = 'IN_PROCESS'
      WHERE status = 'HOLD'
      AND updated_at < NOW() - INTERVAL '1 day' * $1
      RETURNING item_id`;

    const result = await client.query(updateQuery, [holdPeriodDays]);
  } catch (err) {
    console.error('Error updating inventory hold status:', err);
  } finally {
    client.release();
  }
};

// Function to generate unique transaction ID
async function generateTransactionId() {
  const client = await pool.connect();
  try {
    // Get the latest transaction ID
    const result = await client.query(
      'SELECT transaction_id FROM transactions WHERE transaction_id LIKE $1 ORDER BY transaction_id DESC LIMIT 1',
      ['F%']
    );

    let nextNumber = 1; // Start from 1 if no existing IDs

    if (result.rows.length > 0) {
      // Extract number from last ID and increment
      const lastId = result.rows[0].transaction_id;
      const lastNumber = parseInt(lastId.substring(3));
      nextNumber = lastNumber + 1;
    }

    // Keep incrementing until we find an unused ID
    let isUnique = false;
    let transactionId;
    
    while (!isUnique) {
      if (nextNumber > 9999999) {
        nextNumber = 1; // Reset if we exceed 6 digits
      }
      
      transactionId = `F${nextNumber.toString().padStart(7, '0')}`;
      
      // Check if this ID exists
      const existingId = await client.query(
        'SELECT transaction_id FROM transactions WHERE transaction_id = $1',
        [transactionId]
      );
      
      if (existingId.rows.length === 0) {
        isUnique = true;
      } else {
        nextNumber++;
      }
    }
    
    return transactionId;
  } catch (error) {
    console.error('Error in generateTransactionId:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to generate unique item ID
async function generateItemId(metalCategory, client, usedIds = new Set()) {
  try {
    // Get first 4 letters of metal category, uppercase and padded with X if needed
    const prefix = (metalCategory || 'METL').toUpperCase().slice(0, 4).padEnd(4, 'X');
    
    // Get all existing IDs for this prefix
    const existingIds = await client.query(
      'SELECT item_id FROM jewelry WHERE item_id LIKE $1 FOR UPDATE',
      [prefix + '%']
    );
    
    // Create a set of used sequence numbers from both database and current transaction
    const allUsedIds = new Set([...existingIds.rows.map(r => r.item_id), ...usedIds]);
    
    // Find the first available number
    let nextNumber = 1;
    let newItemId;
    
    while (nextNumber <= 999) {
      newItemId = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
      
      if (!allUsedIds.has(newItemId)) {
        return newItemId;
      }
      nextNumber++;
    }
    
    throw new Error(`No available sequence numbers for prefix ${prefix}`);
  } catch (error) {
    console.error('Error in generateItemId:', error);
    throw error;
  }
}

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

      // Convert image BYTEA to base64 if it exists
      const imageBase64 = user.image ? user.image.toString('base64') : null;

      return res.json({
        token,
        user: {
          id: user.employee_id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          image: imageBase64
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

// ============================================================================
// Cash Drawer API Routes
// ============================================================================

// GET /api/cash-drawer/active - Get all active (open) drawer sessions
app.get('/api/cash-drawer/active', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM active_drawer_sessions
      ORDER BY opened_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching active drawer sessions:', error);
    res.status(500).json({ error: 'Failed to fetch active drawer sessions' });
  }
});

// GET /api/cash-drawer/employee/:employeeId/active - Check if employee has an active drawer session
app.get('/api/cash-drawer/employee/:employeeId/active', async (req, res) => {
  const { employeeId } = req.params;

  try {
    const result = await pool.query(`
      SELECT
        s.*,
        calculate_expected_balance(s.session_id) AS current_expected_balance,
        (SELECT COUNT(*) FROM cash_drawer_transactions WHERE session_id = s.session_id) AS transaction_count,
        (SELECT COALESCE(SUM(amount), 0) FROM cash_drawer_transactions WHERE session_id = s.session_id) AS total_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM cash_drawer_adjustments WHERE session_id = s.session_id) AS total_adjustments
      FROM cash_drawer_sessions s
      WHERE s.employee_id = $1 AND s.status = 'open'
      ORDER BY s.opened_at DESC
      LIMIT 1
    `, [employeeId]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error checking active drawer:', error);
    res.status(500).json({ error: 'Failed to check active drawer' });
  }
});

// GET /api/cash-drawer/history - Get drawer session history with optional filters
app.get('/api/cash-drawer/history', async (req, res) => {
  const {
    employee_id,
    start_date,
    end_date,
    status,
    limit = 50,
    offset = 0
  } = req.query;

  try {
    let query = 'SELECT * FROM drawer_session_history WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (employee_id) {
      params.push(employee_id);
      query += ` AND employee_id = $${paramCount++}`;
    }

    if (start_date) {
      params.push(start_date);
      query += ` AND opened_at >= $${paramCount++}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND opened_at <= $${paramCount++}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${paramCount++}`;
    }

    params.push(limit, offset);
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching drawer history:', error);
    res.status(500).json({ error: 'Failed to fetch drawer history' });
  }
});

// GET /api/cash-drawer/:sessionId/details - Get detailed information about a drawer session
app.get('/api/cash-drawer/:sessionId/details', async (req, res) => {
  const { sessionId } = req.params;

  try {
    // Get session details
    const sessionResult = await pool.query(`
      SELECT
        s.*,
        e.first_name || ' ' || e.last_name AS employee_name,
        r.first_name || ' ' || r.last_name AS reconciled_by_name,
        calculate_expected_balance(s.session_id) AS current_expected_balance
      FROM cash_drawer_sessions s
      JOIN employees e ON s.employee_id = e.employee_id
      LEFT JOIN employees r ON s.reconciled_by = r.employee_id
      WHERE s.session_id = $1
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get transactions for this session
    const transactionsResult = await pool.query(`
      SELECT dt.*, t.transaction_date
      FROM cash_drawer_transactions dt
      JOIN transactions t ON dt.transaction_id = t.transaction_id
      WHERE dt.session_id = $1
      ORDER BY dt.created_at DESC
    `, [sessionId]);

    // Get adjustments for this session
    const adjustmentsResult = await pool.query(`
      SELECT
        a.*,
        e.first_name || ' ' || e.last_name AS performed_by_name,
        ap.first_name || ' ' || ap.last_name AS approved_by_name
      FROM cash_drawer_adjustments a
      JOIN employees e ON a.performed_by = e.employee_id
      LEFT JOIN employees ap ON a.approved_by = ap.employee_id
      WHERE a.session_id = $1
      ORDER BY a.created_at DESC
    `, [sessionId]);

    res.json({
      session: sessionResult.rows[0],
      transactions: transactionsResult.rows,
      adjustments: adjustmentsResult.rows
    });
  } catch (error) {
    console.error('Error fetching drawer session details:', error);
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
});

// POST /api/cash-drawer/open - Open a new cash drawer session for an employee
app.post('/api/cash-drawer/open', async (req, res) => {
  const { drawer_id, employee_id, opening_balance, opening_notes } = req.body;

  // Validation
  if (!drawer_id || !employee_id || opening_balance === undefined) {
    return res.status(400).json({ error: 'drawer_id, employee_id and opening_balance are required' });
  }

  if (opening_balance < 0) {
    return res.status(400).json({ error: 'Opening balance cannot be negative' });
  }

  try {
    // Check if employee already has an open drawer
    const existingDrawer = await pool.query(
      'SELECT session_id FROM cash_drawer_sessions WHERE employee_id = $1 AND status = $2',
      [employee_id, 'open']
    );

    if (existingDrawer.rows.length > 0) {
      return res.status(400).json({
        error: 'Employee already has an open drawer session',
        session_id: existingDrawer.rows[0].session_id
      });
    }

    // Create new drawer session
    const result = await pool.query(`
      INSERT INTO cash_drawer_sessions (drawer_id, employee_id, opening_balance, opening_notes, status)
      VALUES ($1, $2, $3, $4, 'open')
      RETURNING *
    `, [drawer_id, employee_id, opening_balance, opening_notes || null]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error opening cash drawer:', error);
    res.status(500).json({ error: 'Failed to open cash drawer' });
  }
});

// POST /api/cash-drawer/:sessionId/adjustment - Add a cash adjustment to a drawer session
app.post('/api/cash-drawer/:sessionId/adjustment', async (req, res) => {
  const { sessionId } = req.params;
  const { amount, adjustment_type, reason, performed_by, approved_by } = req.body;

  // Validation
  if (!amount || !adjustment_type || !reason || !performed_by) {
    return res.status(400).json({
      error: 'amount, adjustment_type, reason, and performed_by are required'
    });
  }

  const validTypes = ['bank_deposit', 'change_order', 'petty_cash', 'correction', 'other'];
  if (!validTypes.includes(adjustment_type)) {
    return res.status(400).json({
      error: `adjustment_type must be one of: ${validTypes.join(', ')}`
    });
  }

  try {
    // Verify session exists and is open
    const sessionCheck = await pool.query(
      'SELECT status FROM cash_drawer_sessions WHERE session_id = $1',
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (sessionCheck.rows[0].status !== 'open') {
      return res.status(400).json({ error: 'Can only add adjustments to open sessions' });
    }

    // Insert adjustment
    const result = await pool.query(`
      INSERT INTO cash_drawer_adjustments
        (session_id, amount, adjustment_type, reason, performed_by, approved_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [sessionId, amount, adjustment_type, reason, performed_by, approved_by || null]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding cash drawer adjustment:', error);
    res.status(500).json({ error: 'Failed to add adjustment' });
  }
});

// POST /api/cash-drawer/:sessionId/transaction - Link a cash transaction to a drawer session
app.post('/api/cash-drawer/:sessionId/transaction', async (req, res) => {
  const { sessionId } = req.params;
  const { transaction_id, amount, transaction_type, payment_id, notes } = req.body;

  // Validation
  if (!transaction_id || !amount || !transaction_type) {
    return res.status(400).json({
      error: 'transaction_id, amount, and transaction_type are required'
    });
  }

  const validTypes = ['sale', 'refund', 'payout'];
  if (!validTypes.includes(transaction_type)) {
    return res.status(400).json({
      error: `transaction_type must be one of: ${validTypes.join(', ')}`
    });
  }

  try {
    const result = await pool.query(`
      INSERT INTO cash_drawer_transactions
        (session_id, transaction_id, amount, transaction_type, payment_id, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [sessionId, transaction_id, amount, transaction_type, payment_id || null, notes || null]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error linking transaction to drawer:', error);
    res.status(500).json({ error: 'Failed to link transaction' });
  }
});

// PUT /api/cash-drawer/:sessionId/close - Close a cash drawer session
app.put('/api/cash-drawer/:sessionId/close', async (req, res) => {
  const { sessionId } = req.params;
  const { actual_balance, closing_notes } = req.body;

  // Validation
  if (actual_balance === undefined) {
    return res.status(400).json({ error: 'actual_balance is required' });
  }

  if (actual_balance < 0) {
    return res.status(400).json({ error: 'Actual balance cannot be negative' });
  }

  try {
    // Update session to closed status
    // The trigger will automatically calculate expected_balance and discrepancy
    const result = await pool.query(`
      UPDATE cash_drawer_sessions
      SET status = 'closed',
          actual_balance = $1,
          closing_notes = $2
      WHERE session_id = $3 AND status = 'open'
      RETURNING *,
        calculate_expected_balance(session_id) AS calculated_expected
    `, [actual_balance, closing_notes || null, sessionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or already closed' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error closing cash drawer:', error);
    res.status(500).json({ error: 'Failed to close cash drawer' });
  }
});

// PUT /api/cash-drawer/:sessionId/reconcile - Reconcile a closed drawer session (manager approval)
app.put('/api/cash-drawer/:sessionId/reconcile', async (req, res) => {
  const { sessionId } = req.params;
  const { reconciled_by, reconciliation_notes } = req.body;

  if (!reconciled_by) {
    return res.status(400).json({ error: 'reconciled_by (employee_id) is required' });
  }

  try {
    const result = await pool.query(`
      UPDATE cash_drawer_sessions
      SET status = 'reconciled',
          reconciled_by = $1,
          reconciled_at = CURRENT_TIMESTAMP,
          reconciliation_notes = $2
      WHERE session_id = $3 AND status = 'closed'
      RETURNING *
    `, [reconciled_by, reconciliation_notes || null, sessionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or not in closed status' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error reconciling cash drawer:', error);
    res.status(500).json({ error: 'Failed to reconcile cash drawer' });
  }
});

// POST /api/cash-drawer/:sessionId/denominations - Save cash denominations for a session
app.post('/api/cash-drawer/:sessionId/denominations', async (req, res) => {
  const { sessionId } = req.params;
  const { denomination_type, counted_by, notes, ...denominations } = req.body;

  // Validation
  if (!denomination_type || !['opening', 'closing'].includes(denomination_type)) {
    return res.status(400).json({ error: 'denomination_type must be either "opening" or "closing"' });
  }

  if (!counted_by) {
    return res.status(400).json({ error: 'counted_by (employee_id) is required' });
  }

  try {
    // Check if session exists
    const sessionCheck = await pool.query(
      'SELECT session_id FROM cash_drawer_sessions WHERE session_id = $1',
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if denomination entry already exists for this session and type
    const existingCheck = await pool.query(
      'SELECT denomination_id FROM cash_denominations WHERE session_id = $1 AND denomination_type = $2',
      [sessionId, denomination_type]
    );

    let result;
    if (existingCheck.rows.length > 0) {
      // Update existing entry
      result = await pool.query(`
        UPDATE cash_denominations
        SET bill_100 = $1, bill_50 = $2, bill_20 = $3, bill_10 = $4, bill_5 = $5,
            coin_2 = $6, coin_1 = $7, coin_0_25 = $8, coin_0_10 = $9, coin_0_05 = $10,
            counted_by = $11, counted_at = CURRENT_TIMESTAMP, notes = $12
        WHERE session_id = $13 AND denomination_type = $14
        RETURNING *, total_amount
      `, [
        denominations.bill_100 || 0, denominations.bill_50 || 0, denominations.bill_20 || 0,
        denominations.bill_10 || 0, denominations.bill_5 || 0, denominations.coin_2 || 0,
        denominations.coin_1 || 0, denominations.coin_0_25 || 0, denominations.coin_0_10 || 0,
        denominations.coin_0_05 || 0, counted_by, notes || null, sessionId, denomination_type
      ]);
    } else {
      // Insert new entry
      result = await pool.query(`
        INSERT INTO cash_denominations (
          session_id, denomination_type, bill_100, bill_50, bill_20, bill_10, bill_5,
          coin_2, coin_1, coin_0_25, coin_0_10, coin_0_05, counted_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *, total_amount
      `, [
        sessionId, denomination_type, denominations.bill_100 || 0, denominations.bill_50 || 0,
        denominations.bill_20 || 0, denominations.bill_10 || 0, denominations.bill_5 || 0,
        denominations.coin_2 || 0, denominations.coin_1 || 0, denominations.coin_0_25 || 0,
        denominations.coin_0_10 || 0, denominations.coin_0_05 || 0, counted_by, notes || null
      ]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving denominations:', error);
    res.status(500).json({ error: 'Failed to save denominations' });
  }
});

// GET /api/cash-drawer/:sessionId/denominations/:type - Get denominations for a session
app.get('/api/cash-drawer/:sessionId/denominations/:type', async (req, res) => {
  const { sessionId, type } = req.params;

  if (!['opening', 'closing'].includes(type)) {
    return res.status(400).json({ error: 'Type must be either "opening" or "closing"' });
  }

  try {
    const result = await pool.query(`
      SELECT * FROM cash_denominations
      WHERE session_id = $1 AND denomination_type = $2
    `, [sessionId, type]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Denominations not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching denominations:', error);
    res.status(500).json({ error: 'Failed to fetch denominations' });
  }
});

// Drawer Configuration Routes
// GET /api/drawer-config - Get drawer configuration
app.get('/api/drawer-config', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drawer_config LIMIT 1');
    if (result.rows.length === 0) {
      // Insert default if doesn't exist
      const insertResult = await pool.query(
        'INSERT INTO drawer_config (number_of_drawers) VALUES (0) RETURNING *'
      );
      res.json(insertResult.rows[0]);
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error fetching drawer config:', error);
    res.status(500).json({ error: 'Failed to fetch drawer configuration' });
  }
});

// PUT /api/drawer-config - Update drawer configuration
app.put('/api/drawer-config', async (req, res) => {
  const { number_of_drawers } = req.body;

  if (number_of_drawers === undefined || number_of_drawers < 0 || number_of_drawers > 50) {
    return res.status(400).json({ error: 'number_of_drawers must be between 0 and 50' });
  }

  try {
    // Update the config
    const configResult = await pool.query(`
      UPDATE drawer_config
      SET number_of_drawers = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM drawer_config LIMIT 1)
      RETURNING *
    `, [number_of_drawers]);

    let config;
    if (configResult.rows.length === 0) {
      // Insert if doesn't exist
      const insertResult = await pool.query(
        'INSERT INTO drawer_config (number_of_drawers) VALUES ($1) RETURNING *',
        [number_of_drawers]
      );
      config = insertResult.rows[0];
    } else {
      config = configResult.rows[0];
    }

    // Ensure Safe drawer exists
    await pool.query(`
      INSERT INTO drawers (drawer_name, drawer_type, is_active, display_order)
      VALUES ('Safe', 'safe', TRUE, 0)
      ON CONFLICT (drawer_name) DO NOTHING
    `);

    // Get current physical drawers
    const currentDrawers = await pool.query(`
      SELECT drawer_id, drawer_name FROM drawers
      WHERE drawer_type = 'physical'
      ORDER BY display_order
    `);

    const currentCount = currentDrawers.rows.length;

    if (number_of_drawers > currentCount) {
      // Add new drawers
      for (let i = currentCount + 1; i <= number_of_drawers; i++) {
        await pool.query(`
          INSERT INTO drawers (drawer_name, drawer_type, is_active, display_order)
          VALUES ($1, 'physical', TRUE, $2)
          ON CONFLICT (drawer_name) DO NOTHING
        `, [`Drawer ${i}`, i]);
      }
    } else if (number_of_drawers < currentCount) {
      // Remove excess drawers (only if they have no sessions)
      for (let i = currentCount; i > number_of_drawers; i--) {
        const drawerName = `Drawer ${i}`;
        // Check if drawer has any sessions
        const sessionCheck = await pool.query(`
          SELECT COUNT(*) as count FROM cash_drawer_sessions
          WHERE drawer_id = (SELECT drawer_id FROM drawers WHERE drawer_name = $1)
        `, [drawerName]);

        if (parseInt(sessionCheck.rows[0].count) === 0) {
          await pool.query('DELETE FROM drawers WHERE drawer_name = $1', [drawerName]);
        } else {
          // Mark as inactive instead of deleting
          await pool.query(
            'UPDATE drawers SET is_active = FALSE WHERE drawer_name = $1',
            [drawerName]
          );
        }
      }
    }

    res.json(config);
  } catch (error) {
    console.error('Error updating drawer config:', error);
    res.status(500).json({ error: 'Failed to update drawer configuration' });
  }
});

// GET /api/drawers - Get all drawers
app.get('/api/drawers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM drawers
      ORDER BY display_order, drawer_id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching drawers:', error);
    res.status(500).json({ error: 'Failed to fetch drawers' });
  }
});

// GET /api/discrepancy-threshold - Get discrepancy threshold configuration
app.get('/api/discrepancy-threshold', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM discrepancy_threshold LIMIT 1');
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      // Return default if not found
      res.json({ threshold_amount: 0.00 });
    }
  } catch (error) {
    console.error('Error fetching discrepancy threshold:', error);
    res.status(500).json({ error: 'Failed to fetch discrepancy threshold' });
  }
});

// PUT /api/discrepancy-threshold - Update discrepancy threshold configuration
app.put('/api/discrepancy-threshold', async (req, res) => {
  const { threshold_amount } = req.body;

  if (threshold_amount === undefined || threshold_amount < 0) {
    return res.status(400).json({ error: 'Valid threshold_amount is required (must be >= 0)' });
  }

  try {
    // Check if a record exists
    const existing = await pool.query('SELECT id FROM discrepancy_threshold LIMIT 1');

    let result;
    if (existing.rows.length > 0) {
      // Update existing record
      result = await pool.query(`
        UPDATE discrepancy_threshold
        SET threshold_amount = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [threshold_amount, existing.rows[0].id]);
    } else {
      // Insert new record
      result = await pool.query(`
        INSERT INTO discrepancy_threshold (threshold_amount)
        VALUES ($1)
        RETURNING *
      `, [threshold_amount]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating discrepancy threshold:', error);
    res.status(500).json({ error: 'Failed to update discrepancy threshold' });
  }
});

// Cash Denomination Routes (for Open Count mode)
// POST /api/cash-drawer/:sessionId/denominations - Save denomination count
app.post('/api/cash-drawer/:sessionId/denominations', async (req, res) => {
  const { sessionId } = req.params;
  const {
    denomination_type,
    bill_100, bill_50, bill_20, bill_10, bill_5,
    coin_2, coin_1, coin_0_25, coin_0_10, coin_0_05,
    counted_by,
    notes
  } = req.body;

  if (!denomination_type || !counted_by) {
    return res.status(400).json({ error: 'denomination_type and counted_by are required' });
  }

  if (!['opening', 'closing'].includes(denomination_type)) {
    return res.status(400).json({ error: 'denomination_type must be either opening or closing' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO cash_denominations (
        session_id, denomination_type,
        bill_100, bill_50, bill_20, bill_10, bill_5,
        coin_2, coin_1, coin_0_25, coin_0_10, coin_0_05,
        counted_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      sessionId, denomination_type,
      bill_100 || 0, bill_50 || 0, bill_20 || 0, bill_10 || 0, bill_5 || 0,
      coin_2 || 0, coin_1 || 0, coin_0_25 || 0, coin_0_10 || 0, coin_0_05 || 0,
      counted_by, notes || null
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving denominations:', error);
    res.status(500).json({ error: 'Failed to save denominations' });
  }
});

// GET /api/cash-drawer/:sessionId/denominations - Get denomination counts for a session
app.get('/api/cash-drawer/:sessionId/denominations', async (req, res) => {
  const { sessionId } = req.params;
  const { type } = req.query; // optional: 'opening' or 'closing'

  try {
    let query = 'SELECT * FROM cash_denominations WHERE session_id = $1';
    const params = [sessionId];

    if (type && ['opening', 'closing'].includes(type)) {
      query += ' AND denomination_type = $2';
      params.push(type);
    }

    query += ' ORDER BY counted_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching denominations:', error);
    res.status(500).json({ error: 'Failed to fetch denominations' });
  }
});

// PUT /api/cash-drawer/denominations/:denominationId - Update denomination count
app.put('/api/cash-drawer/denominations/:denominationId', async (req, res) => {
  const { denominationId } = req.params;
  const {
    bill_100, bill_50, bill_20, bill_10, bill_5,
    coin_2, coin_1, coin_0_25, coin_0_10, coin_0_05,
    notes
  } = req.body;

  try {
    const result = await pool.query(`
      UPDATE cash_denominations
      SET bill_100 = $1, bill_50 = $2, bill_20 = $3, bill_10 = $4, bill_5 = $5,
          coin_2 = $6, coin_1 = $7, coin_0_25 = $8, coin_0_10 = $9, coin_0_05 = $10,
          notes = $11
      WHERE denomination_id = $12
      RETURNING *
    `, [
      bill_100 || 0, bill_50 || 0, bill_20 || 0, bill_10 || 0, bill_5 || 0,
      coin_2 || 0, coin_1 || 0, coin_0_25 || 0, coin_0_10 || 0, coin_0_05 || 0,
      notes || null, denominationId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Denomination record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating denominations:', error);
    res.status(500).json({ error: 'Failed to update denominations' });
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

// GET route for fetching a specific user preference by name
app.get('/api/user_preferences/:preferenceName', async (req, res) => {
  try {
    const { preferenceName } = req.params;
    const result = await pool.query(
      'SELECT * FROM user_preferences WHERE preference_name = $1',
      [preferenceName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Preference not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user preference:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT route for updating user preferences
app.put('/api/user_preferences', async (req, res) => {
  try {
    const { preference_name, preference_value } = req.body;
    const result = await pool.query(
      'UPDATE user_preferences SET preference_value = $2 WHERE preference_name = $1 RETURNING *',
      [preference_name, preference_value]
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

// Get all quotes with customer and employee details
app.get('/api/quotes', async (req, res) => {
  try {
    const query = `
      SELECT 
        q.*,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        e.first_name || ' ' || e.last_name as employee_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN employees e ON q.employee_id = e.employee_id
      ORDER BY q.created_at DESC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific quote by ID
app.get('/api/quotes/:quote_id', async (req, res) => {
  try {
    const { quote_id } = req.params;
    
    const query = `
      SELECT 
        q.*,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        e.first_name || ' ' || e.last_name as employee_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN employees e ON q.employee_id = e.employee_id
      WHERE q.quote_id = $1
    `;
    
    const result = await pool.query(query, [quote_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new quote
app.post('/api/quotes', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { items, customer_id, employee_id, total_amount } = req.body;
    
    // Get the latest quote ID to generate the next sequential number
    const latestQuoteResult = await client.query(
      "SELECT quote_id FROM quotes WHERE quote_id LIKE 'QT%' ORDER BY quote_id DESC LIMIT 1"
    );
    
    let nextNumber = 1;
    if (latestQuoteResult.rows.length > 0) {
      const lastId = latestQuoteResult.rows[0].quote_id;
      nextNumber = parseInt(lastId.slice(2)) + 1;
    }
    
    // Format quote ID as QT followed by sequential number padded to 3 digits
    const quoteId = `QT${nextNumber.toString().padStart(3, '0')}`;
    
    // Verify uniqueness (just in case)
    const existingQuote = await client.query(
      'SELECT quote_id FROM quotes WHERE quote_id = $1',
      [quoteId]
    );
    
    if (existingQuote.rows.length > 0) {
      throw new Error('Failed to generate unique quote ID');
    }
    
    // Get expiration period from configuration
    const configResult = await client.query('SELECT days FROM quote_expiration LIMIT 1');
    const expiresIn = configResult.rows.length > 0 ? configResult.rows[0].days : 30;
    
    // Insert the quote
    const quoteResult = await client.query(
      `INSERT INTO quotes (
        quote_id, customer_id, employee_id, total_amount,
        expires_in, days_remaining, created_at
      ) VALUES ($1, $2, $3, $4, $5, $5, CURRENT_TIMESTAMP)
      RETURNING *`,
      [quoteId, customer_id, employee_id, total_amount, expiresIn]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      ...quoteResult.rows[0],
      quote_id: quoteId,
      expires_in: expiresIn,
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating quote:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
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

// Get items for a specific quote
app.get('/api/quotes/:quote_id/items', async (req, res) => {
  try {
    const { quote_id } = req.params;
    
    const query = `
      SELECT 
        qi.item_id,
        qi.item_price,
        tt.type as transaction_type,
        j.short_desc as description,
        j.buy_price,
        j.pawn_value,
        j.retail_price,
        j.precious_metal_type,
        j.metal_spot_price,
        j.metal_weight,
        j.metal_purity,
        j.purity_value
      FROM quote_items qi
      LEFT JOIN transaction_type tt ON qi.transaction_type_id = tt.id
      LEFT JOIN jewelry j ON qi.item_id = j.item_id
      WHERE qi.quote_id = $1
    `;

    const result = await pool.query(query, [quote_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quote items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a quote item
app.delete('/api/quotes/:quote_id/items/:item_id', async (req, res) => {
  const { quote_id, item_id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // First delete the quote item
    const deleteItemQuery = 'DELETE FROM quote_items WHERE quote_id = $1 AND item_id = $2';
    await client.query(deleteItemQuery, [quote_id, item_id]);

    // Then delete from jewelry
    const deleteJewelryQuery = 'DELETE FROM jewelry WHERE item_id = $1';
    await client.query(deleteJewelryQuery, [item_id]);

    // Then update the quote's total amount
    const updateTotalQuery = `
      UPDATE quotes q
      SET total_amount = COALESCE(
        (SELECT SUM(item_price)
         FROM quote_items
         WHERE quote_id = $1
        ), 0
      )
      WHERE q.quote_id = $1
      RETURNING *
    `;
    const updateResult = await client.query(updateTotalQuery, [quote_id]);

    await client.query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting quote item:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.delete('/api/quotes/:quote_id', async (req, res) => {
  const { quote_id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get all item_ids associated with this quote
    const itemIdsQuery = 'SELECT item_id FROM quote_items WHERE quote_id = $1';
    const itemIdsResult = await client.query(itemIdsQuery, [quote_id]);
    const itemIds = itemIdsResult.rows.map(row => row.item_id);

    // First delete all quote items
    const deleteItemsQuery = 'DELETE FROM quote_items WHERE quote_id = $1';
    await client.query(deleteItemsQuery, [quote_id]);

    // Then delete the jewelry items
    if (itemIds.length > 0) {
      const deleteJewelryQuery = 'DELETE FROM jewelry WHERE item_id = ANY($1)';
      await client.query(deleteJewelryQuery, [itemIds]);
    }

    // Finally delete the quote
    const deleteQuoteQuery = 'DELETE FROM quotes WHERE quote_id = $1 RETURNING *';
    const result = await client.query(deleteQuoteQuery, [quote_id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quote not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting quote:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.put('/api/quotes/:quote_id/items/:item_id', async (req, res) => {
  try {
    const { quote_id, item_id } = req.params;
    const { transaction_type, item_price } = req.body;

    // Get transaction_type_id
    const typeQuery = 'SELECT id FROM transaction_type WHERE type = $1';
    const typeResult = await pool.query(typeQuery, [transaction_type]);
    
    if (typeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    const transaction_type_id = typeResult.rows[0].id;

    // Update quote item
    const query = `
      UPDATE quote_items
      SET transaction_type_id = $1,
          item_price = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE quote_id = $3 AND item_id = $4
      RETURNING *
    `;

    const result = await pool.query(query, [transaction_type_id, item_price, quote_id, item_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote item not found' });
    }

    // Update quote total_amount
    const totalQuery = `
      UPDATE quotes
      SET total_amount = (
        SELECT SUM(item_price)
        FROM quote_items
        WHERE quote_id = $1
      )
      WHERE quote_id = $1
      RETURNING total_amount
    `;

    const totalResult = await pool.query(totalQuery, [quote_id]);

    res.json({
      ...result.rows[0],
      total_amount: totalResult.rows[0].total_amount
    });
  } catch (error) {
    console.error('Error updating quote item:', error);
    res.status(500).json({ error: error.message });
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

// Jewelry update endpoint for quote conversion
app.put('/api/jewelry/quote/:quoteId/convert', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { quoteId } = req.params;
    const results = [];

    // Get items from quote_items for this quote
    const quoteItemsQuery = `
      SELECT qi.*, tt.type as transaction_type 
      FROM quote_items qi
      JOIN transaction_type tt ON qi.transaction_type_id = tt.id
      WHERE qi.quote_id = $1
    `;
    const quoteItems = await client.query(quoteItemsQuery, [quoteId]);
    // Process each quote item
    for (const quoteItem of quoteItems.rows) {
      // Find matching jewelry item
      const jewelryQuery = `
        SELECT * FROM jewelry
        WHERE item_id = $1
      `;
      const jewelryResult = await client.query(jewelryQuery, [quoteItem.item_id]);
      
      if (jewelryResult.rows.length > 0) {
        const jewelryItem = jewelryResult.rows[0];
        
        // Generate new item ID based on metal category
        const usedIds = new Set();
        const newItemId = await generateItemId(jewelryItem.metal_category, client, usedIds);
      
        // Prepare price update based on transaction type
        let priceUpdate = '';
        if (quoteItem.transaction_type === 'buy') {
          priceUpdate = 'buy_price = $3';
        } else if (quoteItem.transaction_type === 'pawn') {
          priceUpdate = 'pawn_value = $3';
        } else if (quoteItem.transaction_type === 'retail') {
          priceUpdate = 'retail_price = $3';
        }
        
        const deleteQuoteItemQuery = `
          DELETE FROM quote_items
          WHERE quote_id = $1 AND item_id = $2
        `;
        await client.query(deleteQuoteItemQuery, [quoteId, quoteItem.item_id]);

        // Update jewelry item
        const updateQuery = `
          UPDATE jewelry 
          SET 
            item_id = $1,
            status = $2,
            ${priceUpdate},
            updated_at = CURRENT_TIMESTAMP
          WHERE item_id = $4
          RETURNING *
        `;

        const result = await client.query(updateQuery, [
          newItemId,
          'HOLD',
          quoteItem.item_price,
          quoteItem.item_id
        ]);

        if (result.rows.length > 0) {
          results.push(result.rows[0]);
        }
      }
    }

    const deleteQuoteQuery = `
            DELETE FROM quotes WHERE quote_id = $1
          `;
          await client.query(deleteQuoteQuery, [quoteId]);

    await client.query('COMMIT');
    res.json(results);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error converting quote items:', err);
    res.status(500).json({ error: 'Failed to update jewelry prices', details: err.message });
    } finally {
        client.release();
    }
});

// Move item to scrap
app.post('/api/jewelry/:id/move-to-scrap', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { moved_by } = req.body; // ID of the employee performing the action
    if (!moved_by) {
      return res.status(400).json({ error: 'Employee ID (moved_by) is required' });
    }
    
    // First, get the current item data for history
    const { rows: [currentItem] } = await pool.query('SELECT * FROM jewelry WHERE item_id = $1', [id]);
    if (!currentItem) {
      return res.status(404).json({ error: 'Jewelry item not found' });
    }
    
    const { bucket_id } = req.body;
    
    if (!bucket_id) {
      return res.status(400).json({ error: 'Bucket ID is required' });
    }
       // 3. Add to item history
    const currentStatusQuery = await client.query(
      'SELECT status FROM jewelry WHERE item_id = $1',
      [id]
    );
    const oldStatus = currentStatusQuery.rows[0]?.status || 'UNKNOWN';
    
    // Create the changed_fields JSON object
    const changedFields = {
      status: {
        old: oldStatus,
        new: 'SCRAP PROCESS'
      }
    };
    // Get the next version number
    const versionResult = await client.query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM jewelry_item_history WHERE item_id = $1',
      [id]
    );
    const version_number = versionResult.rows[0].next_version;

    // Insert the history record
    await client.query(
      `INSERT INTO jewelry_item_history (
        item_id,
        version_number,
        changed_by,
        action_type,
        changed_fields,
        change_notes
      ) VALUES ($1, $2, $3, 'STATUS_CHANGE', $4, 'Moved to SCRAP PROCESS')`,
      [id, version_number, moved_by, changedFields]
    );
    // 1. Update the jewelry item status to SCRAP PROCESS
    const updateJewelryQuery = await client.query(
      `UPDATE jewelry SET status = 'SCRAP PROCESS', updated_at = CURRENT_TIMESTAMP WHERE item_id = $1 RETURNING *`,
      [id]
    );
    // 2. Add item_id to the selected bucket's item_id array
    await client.query(
      `UPDATE scrap 
       SET item_id = item_id || $1::jsonb,
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $2::integer
       WHERE bucket_id = $3::integer
       AND NOT item_id @> $1::jsonb`, 
      [JSON.stringify([id]), moved_by, bucket_id]
    );
    
 
    // Return success response
    res.json({ 
      success: true, 
      message: 'Item moved to scrap successfully',
      item: {
        item_id: id,
        bucket_id: bucket_id,
        moved_by: parseInt(moved_by),
        moved_at: new Date().toISOString()
      }
    });
    
  } catch (err) {
    console.error('Error moving item to scrap:', err);
    res.status(500).json({ 
      error: 'Failed to move item to scrap',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// Update jewelry item (general update endpoint)
app.put('/api/jewelry/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const updates = req.body;

    await client.query('BEGIN');

    // Check if item exists
    const checkQuery = 'SELECT * FROM jewelry WHERE item_id = $1';
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      console.log('Item not found:', id);
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Jewelry item not found' });
    }

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;

    // List of allowed fields to update
    const allowedFields = [
      'status', 'category', 'short_desc', 'long_desc',
      'precious_metal_type', 'metal_purity', 'metal_weight',
      'primary_gem_type', 'primary_gem_category', 'primary_gem_size',
      'primary_gem_quantity', 'primary_gem_shape', 'primary_gem_color',
      'primary_gem_quality', 'primary_gem_weight', 'secondary_gem_type',
      'secondary_gem_category', 'secondary_gem_size', 'secondary_gem_quantity',
      'secondary_gem_shape', 'secondary_gem_color', 'secondary_gem_quality',
      'secondary_gem_weight', 'metal_spot_price', 'notes', 'price',
      'melt_value', 'weight_grams', 'metal_category'
    ];

    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        fields.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      console.log('No valid fields to update');
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const updateQuery = `
      UPDATE jewelry
      SET ${fields.join(', ')}
      WHERE item_id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating jewelry item:', err);
    res.status(500).json({
      error: 'Failed to update jewelry item',
      details: err.message
    });
  } finally {
    client.release();
  }
});

// Get a single jewelry item by ID
app.get('/api/jewelry/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT
        j.*,
        TO_CHAR(j.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
        TO_CHAR(j.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at,
        tt.type as source,
        CONCAT(c.first_name, ' ', c.last_name) as bought_from
      FROM jewelry j
      LEFT JOIN transaction_items ti ON j.item_id = ti.item_id
      LEFT JOIN transactions t ON ti.transaction_id = t.transaction_id
      LEFT JOIN transaction_type tt ON ti.transaction_type_id = tt.id
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE j.item_id = $1`;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Jewelry item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching jewelry item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all jewelry items
app.get('/api/jewelry', async (req, res) => {
  try {
    const query = `
      SELECT 
        j.*,
        TO_CHAR(j.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
        TO_CHAR(j.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at
      FROM jewelry j
      ORDER BY j.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching jewelry items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add jewelry item endpoint
// New endpoint for jewelry with image uploads
app.post('/api/jewelry/with-images', uploadJewelryImages, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Parse cartItems from form data
    const cartItems = JSON.parse(req.body.cartItems || '[]');
    const quote_id = req.body.quote_id;
    const imageMetadata = req.body.imageMetadata ? JSON.parse(req.body.imageMetadata) : [];
    const results = [];

    // Store uploaded files temporarily (will be saved with meaningful names after getting item_id)
    const uploadedFiles = req.files || [];
    // Process each item sequentially
    let itemCounter = 1;
    let globalImageIndex = 0; // Track global image index across all items

    for (let itemIdx = 0; itemIdx < cartItems.length; itemIdx++) {
      const item = cartItems[itemIdx];

      // Use quote_id as item_id if provided, otherwise generate a new one
      let item_id, status;
      if (quote_id) {
        const sequentialNumber = itemCounter.toString().padStart(2, '0');
        item_id = `${quote_id}-${sequentialNumber}`;
        itemCounter++;
        status = 'QUOTED';
      } else {
        const usedIds = new Set();
        item_id = await generateItemId(item.metal_category, client, usedIds);
        status = 'HOLD';
      }

      // Now save images with meaningful filenames using item_id
      const processedImages = [];

      // Get the number of images for this item from imagesMeta or count files
      const itemImageCount = item.imagesMeta ? item.imagesMeta.length : 0;

      if (uploadedFiles.length > 0 && itemImageCount > 0) {

        for (let i = 0; i < itemImageCount; i++) {
          const fileIndex = globalImageIndex + i;
          if (fileIndex >= uploadedFiles.length) break;

          const file = uploadedFiles[fileIndex];

          // Get file extension from original filename
          const ext = path.extname(file.originalname).toLowerCase() || '.jpg';

          // Create meaningful filename: ITEMID-1.jpg, ITEMID-2.jpg, etc.
          const imageNumber = i + 1;
          const filename = `${item_id}-${imageNumber}${ext}`;
          const filepath = path.join(jewelryUploadDir, filename);

          // Save file to disk with meaningful name
          await fs.promises.writeFile(filepath, file.buffer);

          // Get isPrimary from metadata if available, otherwise default to first image
          const isPrimary = item.imagesMeta && item.imagesMeta[i]
            ? item.imagesMeta[i].isPrimary
            : i === 0;

          // Store relative path for database
          processedImages.push({
            url: `/uploads/jewelry/${filename}`,
            isPrimary: isPrimary
          });
        }

        globalImageIndex += itemImageCount;
      }

      // Insert jewelry record
      const jewelryQuery = `
        INSERT INTO jewelry (
          item_id,
          long_desc,
          short_desc,
          category,
          brand,
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
          buy_price,
          pawn_value,
          retail_price,
          status,
          location,
          condition,
          metal_spot_price,
          notes,
          item_price,
          melt_value,
          total_weight,
          inventory_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40)
        RETURNING *`;

      const jewelryValues = [
        item_id,
        item.long_desc || '',
        item.short_desc || '',
        item.metal_category || '',
        item.brand || '',
        item.vintage || false,
        item.stamps || '',
        JSON.stringify(processedImages),
        parseFloat(item.metal_weight) || 0,
        item.precious_metal_type || '',
        item.non_precious_metal_type || '',
        item.metal_purity || '',
        item.jewelry_color || '',
        parseFloat(item.purity_value) || 0,
        parseFloat(item.est_metal_value) || 0,
        item.primary_gem_type || null,
        item.primary_gem_category || null,
        item.primary_gem_size || null,
        parseInt(item.primary_gem_quantity) || 0,
        item.primary_gem_shape || null,
        parseFloat(item.primary_gem_weight) || 0,
        item.primary_gem_color || null,
        item.primary_gem_exact_color || null,
        item.primary_gem_clarity || null,
        item.primary_gem_cut || null,
        item.primary_gem_lab_grown || false,
        item.primary_gem_authentic || false,
        parseFloat(item.primary_gem_value) || 0,
        item.buy_price,
        item.pawn_price,
        item.retail_price,
        status,
        'SOUTH STORE',
        'GOOD',
        item.metal_spot_price,
        item.notes,
        item.price,
        item.melt_value,
        (parseFloat(item.metal_weight) || 0) +
        (parseFloat(item.primary_gem_weight) || 0) * (parseInt(item.primary_gem_quantity) || 0) +
        (item.secondary_gems || []).reduce((sum, gem) =>
          sum + (parseFloat(gem.weight) || 0) * (parseInt(gem.quantity) || 0), 0),
        'jewelry'
      ];

      const jewelryResult = await client.query(jewelryQuery, jewelryValues);

      // Insert secondary gems if any
      if (item.secondary_gems && Array.isArray(item.secondary_gems)) {
        for (const gem of item.secondary_gems) {
          const secondaryGemQuery = `
            INSERT INTO jewelry_secondary_gems (
              item_id, gem_type, gem_category, gem_size, gem_quantity,
              gem_shape, gem_weight, gem_color, gem_exact_color,
              gem_clarity, gem_cut, gem_lab_grown, gem_authentic, gem_value
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`;

          await client.query(secondaryGemQuery, [
            item_id,
            gem.gem_type || null,
            gem.gem_category || null,
            gem.gem_size || null,
            parseInt(gem.gem_quantity) || 0,
            gem.gem_shape || null,
            parseFloat(gem.gem_weight) || 0,
            gem.gem_color || null,
            gem.gem_exact_color || null,
            gem.gem_clarity || null,
            gem.gem_cut || null,
            gem.gem_lab_grown || false,
            gem.gem_authentic || false,
            parseFloat(gem.gem_value) || 0
          ]);
        }
      }

      results.push(jewelryResult.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json(results); // Return array directly to match /api/jewelry endpoint

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating jewelry with images:', error);
    res.status(500).json({ error: error.message }); // Match /api/jewelry error format
  } finally {
    client.release();
  }
});

app.post('/api/jewelry', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { cartItems, quote_id } = req.body;
    const results = [];
    
    // Process each item sequentially
    let itemCounter = 1; // Counter for sequential numbers
    
    // Process cart items to ensure proper format for PostgreSQL
    const processedCartItems = cartItems.map(item => {
      // Handle images to ensure proper JSON format
      let processedImages;
      
      if (item.images) {
        if (typeof item.images === 'string') {
          try {
            processedImages = JSON.parse(item.images);
          } catch (e) {
            processedImages = [];
          }
        } else if (Array.isArray(item.images)) {
          // Convert each image object to a simple URL string or a proper JSON object
          processedImages = item.images.map(img => {
            if (typeof img === 'object') {
              return {
                url: img.url || ''
              };
            }
            return img;
          });
        } else {
          processedImages = [];
        }
      } else {
        processedImages = [];
      }
      
      return {
        ...item,
        images: processedImages
      };
    });
    
    for (const item of processedCartItems) {
      // Use quote_id as item_id if provided, otherwise generate a new one
      let item_id, status;
      if (quote_id) {
        // Add sequential number to quote_id (e.g., QT001-01)
        const sequentialNumber = itemCounter.toString().padStart(2, '0');
        item_id = `${quote_id}-${sequentialNumber}`;
        itemCounter++;
        status = 'QUOTED';
      } else {
        // Generate unique item ID for non-quote items
        const usedIds = new Set();
        item_id = await generateItemId(item.metal_category, client, usedIds);
        status = 'HOLD';
      }
      // Insert jewelry record
      const jewelryQuery = `
        INSERT INTO jewelry (
          item_id,
          long_desc,
          short_desc,
          category,
          brand,
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
          buy_price,
          pawn_value,
          retail_price,
          status,
          location,
          condition,
          metal_spot_price,
          notes,
          item_price,
          melt_value,
          total_weight,
          inventory_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40)
        RETURNING *`;

      const jewelryValues = [
        item_id,                                              // 1
        item.long_desc || '',                                    // 2
        item.short_desc || '',                             // 3
        item.metal_category || '',                                // 4
        item.brand || '',                                       // 5
        item.vintage || false,                                 // 6
        item.stamps || '',                                     // 7
        JSON.stringify(item.images || []),                      // 8 - Ensure proper JSON string format
        parseFloat(item.metal_weight) || 0,                       // 9
        item.precious_metal_type || '',                           // 10
        item.non_precious_metal_type || '',                       // 11
        item.metal_purity || '',                                  // 12
        item.jewelry_color || '',                                 // 13
        parseFloat(item.purity_value) || 0,                // 14
        parseFloat(item.est_metal_value) || 0,                       // 15
        item.primary_gem_type || null,                             // 16
        item.primary_gem_category || null,                      // 17
        item.primary_gem_size || null,                             // 18
        parseInt(item.primary_gem_quantity) || 0,                // 19
        item.primary_gem_shape || null,                            // 20
        parseFloat(item.primary_gem_weight) || 0,                // 21
        item.primary_gem_color || null,                            // 22
        item.primary_gem_exact_color || null,                      // 23
        item.primary_gem_clarity || null,                          // 24
        item.primary_gem_cut || null,                              // 25
        item.primary_gem_lab_grown || false,                     // 26
        item.primary_gem_authentic || false,                     // 27
        parseFloat(item.primary_gem_value) || 0,                 // 28
        item.buy_price,    // 29
        item.pawn_price,   // 30
        item.retail_price, // 31
        status,         //32
        'SOUTH STORE',          // 33
        'GOOD',          // 34
        item.metal_spot_price,
        item.notes,
        item.price,
        item.melt_value,
        // Calculate total weight: metal_weight + primary_gem_weight + sum(secondary_gem_weights)
        (parseFloat(item.metal_weight) || 0) + 
        (parseFloat(item.primary_gem_weight) || 0) * (parseInt(item.primary_gem_quantity) || 0) +
        (item.secondary_gems || []).reduce((sum, gem) => 
          sum + (parseFloat(gem.secondary_gem_weight) || 0) * (parseInt(gem.secondary_gem_quantity) || 1), 0),
        'jewelry'
      ];

      const result = await client.query(jewelryQuery, jewelryValues);
      results.push(result.rows[0]);

      if(quote_id) {
        const itemQuery = `
          INSERT INTO quote_items (
            quote_id, item_id, transaction_type_id,
            item_price
          )
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;

        await client.query(itemQuery, [
          quote_id,
          item_id,
          item.transaction_type_id,
          item.price
        ]);
      }
      
    }

    await client.query('COMMIT');
    res.status(201).json(results);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating jewelry items:', err);
    res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Inventory Status API Endpoints
app.get('/api/inventory-status', async (req, res) => {
  try {
    const query = 'SELECT * FROM inventory_status ORDER BY status_name';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory statuses:', error);
    res.status(500).json({ error: 'Failed to fetch inventory statuses' });
  }
});

app.get('/api/inventory-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM inventory_status WHERE status_id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory status not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching inventory status:', error);
    res.status(500).json({ error: 'Failed to fetch inventory status' });
  }
});

app.post('/api/inventory-status', async (req, res) => {
  const client = await pool.connect();
  try {
    const { status_code, status_name, description } = req.body;
    
    // Validate required fields
    if (!status_code || !status_name) {
      return res.status(400).json({ error: 'status_code and status_name are required' });
    }
    
    await client.query('BEGIN');
    
    // Check if status_code already exists
    const checkQuery = 'SELECT status_id FROM inventory_status WHERE status_code = $1';
    const checkResult = await client.query(checkQuery, [status_code]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Status code already exists' });
    }
    
    // Insert new status
    const insertQuery = `
      INSERT INTO inventory_status (status_code, status_name, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [status_code, status_name, description || null]);
    await client.query('COMMIT');
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating inventory status:', error);
    res.status(500).json({ error: 'Failed to create inventory status' });
  } finally {
    client.release();
  }
});

app.put('/api/inventory-status/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status_code, status_name, description } = req.body;
    
    // Validate required fields
    if (!status_code || !status_name) {
      return res.status(400).json({ error: 'status_code and status_name are required' });
    }
    
    await client.query('BEGIN');
    
    // Check if status exists
    const checkQuery = 'SELECT status_id FROM inventory_status WHERE status_id = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory status not found' });
    }
    
    // Check if status_code is being changed to one that already exists
    const codeCheckQuery = 'SELECT status_id FROM inventory_status WHERE status_code = $1 AND status_id != $2';
    const codeCheckResult = await client.query(codeCheckQuery, [status_code, id]);
    
    if (codeCheckResult.rows.length > 0) {
      return res.status(400).json({ error: 'Status code already in use by another status' });
    }
    
    // Update status
    const updateQuery = `
      UPDATE inventory_status 
      SET status_code = $1, 
          status_name = $2, 
          description = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE status_id = $4
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [
      status_code, 
      status_name, 
      description || null, 
      id
    ]);
    
    await client.query('COMMIT');
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory status not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating inventory status:', error);
    res.status(500).json({ error: 'Failed to update inventory status' });
  } finally {
    client.release();
  }
});

app.delete('/api/inventory-status/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // Check if status exists
    const checkQuery = 'SELECT status_id FROM inventory_status WHERE status_id = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory status not found' });
    }
    
    // Check if status is in use
    const inUseQuery = 'SELECT item_id FROM jewelry WHERE status = (SELECT status_code FROM inventory_status WHERE status_id = $1) LIMIT 1';
    const inUseResult = await client.query(inUseQuery, [id]);
    
    if (inUseResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete status that is in use by jewelry items' 
      });
    }
    
    // Delete status
    const deleteQuery = 'DELETE FROM inventory_status WHERE status_id = $1 RETURNING *';
    const result = await client.query(deleteQuery, [id]);
    
    await client.query('COMMIT');
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory status not found' });
    }
    
    res.json({ message: 'Inventory status deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting inventory status:', error);
    res.status(500).json({ error: 'Failed to delete inventory status' });
  } finally {
    client.release();
  }
});

// Buy Ticket API Endpoints
app.get('/api/buy-ticket', async (req, res) => {
  try {
    const { buy_ticket_id, transaction_id } = req.query;

    let query = 'SELECT * FROM buy_ticket';
    const params = [];

    if (buy_ticket_id) {
      query += ' WHERE buy_ticket_id = $1';
      params.push(buy_ticket_id);
    } else if (transaction_id) {
      query += ' WHERE transaction_id = $1';
      params.push(transaction_id);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching buy tickets:', error);
    res.status(500).json({ error: 'Failed to fetch buy tickets' });
  }
});

app.post('/api/buy-ticket', async (req, res) => {
  const client = await pool.connect();
  try {
    const { buy_ticket_id, transaction_id, item_id } = req.body;

    // Validate required fields
    if (!buy_ticket_id) {
      return res.status(400).json({ error: 'buy_ticket_id is required' });
    }

    await client.query('BEGIN');

    // Insert new buy_ticket record
    const insertQuery = `
      INSERT INTO buy_ticket (buy_ticket_id, transaction_id, item_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      buy_ticket_id,
      transaction_id || null,
      item_id || null
    ]);

    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating buy ticket:', error);
    res.status(500).json({ error: 'Failed to create buy ticket' });
  } finally {
    client.release();
  }
});

// Sale Ticket API Endpoints
app.get('/api/sale-ticket', async (req, res) => {
  try {
    const { sale_ticket_id, transaction_id } = req.query;

    let query = 'SELECT * FROM sale_ticket';
    const params = [];

    if (sale_ticket_id) {
      query += ' WHERE sale_ticket_id = $1';
      params.push(sale_ticket_id);
    } else if (transaction_id) {
      query += ' WHERE transaction_id = $1';
      params.push(transaction_id);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sale tickets:', error);
    res.status(500).json({ error: 'Failed to fetch sale tickets' });
  }
});

app.post('/api/sale-ticket', async (req, res) => {
  const client = await pool.connect();
  try {
    const { sale_ticket_id, transaction_id, item_id } = req.body;

    // Validate required fields
    if (!sale_ticket_id) {
      return res.status(400).json({ error: 'sale_ticket_id is required' });
    }

    await client.query('BEGIN');

    // Insert new sale_ticket record
    const insertQuery = `
      INSERT INTO sale_ticket (sale_ticket_id, transaction_id, item_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      sale_ticket_id,
      transaction_id || null,
      item_id || null
    ]);

    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating sale ticket:', error);
    res.status(500).json({ error: 'Failed to create sale ticket' });
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
  try {
    const { days } = req.body;

    // Validate days value
    if (days <= 0) {
      return res.status(400).json({ error: 'Hold period days must be greater than 0' });
    }

    // Check if the inventory hold period feature is enabled
    const preferenceResult = await pool.query(
      "SELECT preference_value FROM user_preferences WHERE preference_name = 'inventoryHoldPeriodEnabled'"
    );
    
    const isEnabled = preferenceResult.rows.length > 0 && preferenceResult.rows[0].preference_value === 'true';

    // Check if a record already exists
    const checkResult = await pool.query('SELECT * FROM inventory_hold_period');
    
    let result;
    if (checkResult.rows.length === 0) {
      // Insert new record
      result = await pool.query(
        'INSERT INTO inventory_hold_period (days) VALUES ($1) RETURNING *',
        [days]
      );
    } else {
      // Update existing record
      result = await pool.query(
        'UPDATE inventory_hold_period SET days = $1, updated_at = CURRENT_TIMESTAMP RETURNING *',
        [days]
      );
      
      // Only update items if the feature is enabled
      if (isEnabled) {
        // Update items that have been in HOLD status for longer than the new days value
        // This sets them to IN_PROCESS status (not available for sale)
        await pool.query(`
          UPDATE jewelry
          SET status = 'IN_PROCESS'
          WHERE status = 'HOLD'
          AND CURRENT_TIMESTAMP - updated_at > interval '${days} days'
        `);
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating inventory hold period config:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET route for fetching receipt config
app.get('/api/receipt-config', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM receipt_config ORDER BY created_at DESC LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No receipt configuration found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching receipt config:', err);
    res.status(500).json({ error: 'Failed to fetch receipt configuration' });
  }
});

// PUT route for updating receipt config
app.put('/api/receipt-config', async (req, res) => {
  try {
    const {
      transaction_receipt,
      buy_receipt,
      pawn_receipt,
      layaway_receipt,
      return_receipt,
      refund_receipt
    } = req.body;

    // Check if a record already exists
    const checkResult = await pool.query('SELECT * FROM receipt_config');

    let result;
    if (checkResult.rows.length === 0) {
      // Insert new record
      result = await pool.query(
        `INSERT INTO receipt_config (transaction_receipt, buy_receipt, pawn_receipt, layaway_receipt, return_receipt, refund_receipt)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [transaction_receipt, buy_receipt, pawn_receipt, layaway_receipt, return_receipt, refund_receipt]
      );
    } else {
      // Update existing record
      result = await pool.query(
        `UPDATE receipt_config
         SET transaction_receipt = $1, buy_receipt = $2, pawn_receipt = $3,
             layaway_receipt = $4, return_receipt = $5, refund_receipt = $6,
             updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [transaction_receipt, buy_receipt, pawn_receipt, layaway_receipt, return_receipt, refund_receipt]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating receipt config:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Customer Preferences Configuration API Endpoints
app.get('/api/customer-preferences/config', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM customer_headers_preferences 
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No customer preferences configuration found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching customer preferences config:', err);
    res.status(500).json({ error: 'Failed to fetch customer preferences configuration' });
  }
});

app.put('/api/customer-preferences/config', async (req, res) => {
  const client = await pool.connect();
  try {
    // Extract all the boolean fields from the request
    const { 
      display_header, header_style,
      show_id, show_first_name, show_last_name, show_email, show_phone,
      show_address_line1, show_address_line2, show_city, show_state,
      show_postal_code, show_country, show_id_type, show_id_number,
      show_id_expiry, show_gender, show_height, show_weight,
      show_date_of_birth, show_status, show_risk_level, show_notes
    } = req.body;
    
    await client.query('BEGIN');

    // Update configuration or insert if none exists
    const updateResult = await client.query(`
      UPDATE customer_headers_preferences
      SET 
        display_header = $1,
        header_style = $2,
        show_id = $3,
        show_first_name = $4,
        show_last_name = $5,
        show_email = $6,
        show_phone = $7,
        show_address_line1 = $8,
        show_address_line2 = $9,
        show_city = $10,
        show_state = $11,
        show_postal_code = $12,
        show_country = $13,
        show_id_type = $14,
        show_id_number = $15,
        show_id_expiry = $16,
        show_gender = $17,
        show_height = $18,
        show_weight = $19,
        show_date_of_birth = $20,
        show_status = $21,
        show_risk_level = $22,
        show_notes = $23,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      display_header, header_style, 
      show_id, show_first_name, show_last_name, show_email, show_phone,
      show_address_line1, show_address_line2, show_city, show_state,
      show_postal_code, show_country, show_id_type, show_id_number,
      show_id_expiry, show_gender, show_height, show_weight,
      show_date_of_birth, show_status, show_risk_level, show_notes
    ]);

    // If no rows were updated, insert new configuration
    let result;
    if (updateResult.rowCount === 0) {
      result = await client.query(`
        INSERT INTO customer_preferences (
          display_header, header_style, 
          show_id, show_first_name, show_last_name, show_email, show_phone,
          show_address_line1, show_address_line2, show_city, show_state,
          show_postal_code, show_country, show_id_type, show_id_number,
          show_id_expiry, show_gender, show_height, show_weight,
          show_date_of_birth, show_status, show_risk_level, show_notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `, [
        display_header, header_style, 
        show_id, show_first_name, show_last_name, show_email, show_phone,
        show_address_line1, show_address_line2, show_city, show_state,
        show_postal_code, show_country, show_id_type, show_id_number,
        show_id_expiry, show_gender, show_height, show_weight,
        show_date_of_birth, show_status, show_risk_level, show_notes
      ]);
    } else {
      result = updateResult;
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating customer preferences config:', err);
    res.status(500).json({ error: 'Failed to update customer preferences configuration' });
  } finally {
    client.release();
  }
});

// Customer routes
app.get('/api/customers', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      first_name,
      last_name,
      status,
      risk_level,
      created_from,
      created_to,
      id_type,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // Calculate offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (first_name) {
      conditions.push(`LOWER(first_name) LIKE $${paramCount}`);
      params.push(`%${first_name.toLowerCase()}%`);
      paramCount++;
    }

    if (last_name) {
      conditions.push(`LOWER(last_name) LIKE $${paramCount}`);
      params.push(`%${last_name.toLowerCase()}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (risk_level) {
      conditions.push(`risk_level = $${paramCount}`);
      params.push(risk_level);
      paramCount++;
    }

    if (id_type) {
      conditions.push(`id_type = $${paramCount}`);
      params.push(id_type);
      paramCount++;
    }

    if (created_from) {
      conditions.push(`created_at >= $${paramCount}`);
      params.push(created_from);
      paramCount++;
    }

    if (created_to) {
      conditions.push(`created_at <= $${paramCount}`);
      params.push(created_to + ' 23:59:59');
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Validate sort_by to prevent SQL injection
    const allowedSortColumns = ['created_at', 'first_name', 'last_name', 'email', 'status', 'risk_level'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM customers ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCustomers = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCustomers / parseInt(limit));

    // Get paginated customers (including images for display)
    const dataQuery = `
      SELECT
        id, first_name, last_name, email, phone,
        address_line1, address_line2, city, state, postal_code, country,
        id_type, id_number,
        TO_CHAR(id_expiry_date, 'YYYY-MM-DD') as id_expiry_date,
        TO_CHAR(date_of_birth, 'YYYY-MM-DD') as date_of_birth,
        status, risk_level, notes, gender, height, weight, tax_exempt,
        image, id_image_front, id_image_back,
        created_at, updated_at
      FROM customers
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(parseInt(limit), offset);

    const result = await pool.query(dataQuery, params);

    res.json({
      customers: result.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_customers: totalCustomers,
        per_page: parseInt(limit),
        has_next: parseInt(page) < totalPages,
        has_previous: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.get('/api/customers/search', async (req, res) => {
  const client = await pool.connect();
  try {
    const { first_name, last_name, phone, id_number, email, limit = 50 } = req.query;

    // If all search terms are the same, use OR logic for general search
    const isSameSearchTerm = first_name === last_name && last_name === phone && phone === email;

    if (isSameSearchTerm && first_name) {
      // General search - search across all fields with OR
      const searchTerm = first_name.toLowerCase();
      const query = `
        SELECT id, first_name, last_name, email, phone, status
        FROM customers
        WHERE LOWER(first_name) LIKE $1
           OR LOWER(last_name) LIKE $1
           OR LOWER(email) LIKE $1
           OR LOWER(phone) LIKE $1
           OR LOWER(first_name || ' ' || last_name) LIKE $1
        ORDER BY
          CASE
            WHEN LOWER(first_name) = $2 THEN 1
            WHEN LOWER(last_name) = $2 THEN 2
            WHEN LOWER(first_name || ' ' || last_name) = $2 THEN 3
            ELSE 4
          END,
          created_at DESC
        LIMIT $3
      `;
      const result = await client.query(query, [`%${searchTerm}%`, searchTerm, limit]);
      res.json(result.rows);
      return;
    }

    // Original logic for specific field searches (AND logic)
    // Return all customer fields including images for the search dialog
    let query = `SELECT
      id, first_name, last_name, email, phone, status,
      TO_CHAR(date_of_birth, 'YYYY-MM-DD') as date_of_birth,
      id_number, image, id_image_front, id_image_back
      FROM customers WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (first_name) {
      query += ` AND LOWER(first_name) LIKE $${paramCount}`;
      params.push(`${first_name.toLowerCase()}%`);
      paramCount++;
    }

    if (last_name) {
      query += ` AND LOWER(last_name) LIKE $${paramCount}`;
      params.push(`${last_name.toLowerCase()}%`);
      paramCount++;
    }

    if (id_number) {
      query += ` AND CAST(id_number AS TEXT) ILIKE $${paramCount}`;
      params.push(`%${id_number}%`);
      paramCount++;
    }

    if (phone) {
      query += ` AND LOWER(phone) LIKE $${paramCount}`;
      params.push(`%${phone}%`);
      paramCount++;
    }

    if (email) {
      query += ` AND LOWER(email) LIKE $${paramCount}`;
      params.push(`%${email}%`);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

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

app.post('/api/customers', uploadCustomerImages, async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone,
      address_line1, address_line2, city, state, postal_code, country,
      id_type, id_number, id_expiry_date,
      date_of_birth, status, risk_level, notes, gender, height, weight, tax_exempt
    } = req.body;

    // Convert tax_exempt string to boolean (FormData sends "true"/"false" as strings)
    const taxExemptBool = tax_exempt === 'true' || tax_exempt === true;
    
    // Handle multiple image uploads
    let image = null;
    let id_image_front = null;
    let id_image_back = null;
    
    // Get files from req.files
    if (req.files) {
      // Main customer photo
      if (req.files.image && req.files.image[0] && req.files.image[0].buffer) {
        image = req.files.image[0].buffer;
      }
      
      // ID front image
      if (req.files.id_image_front && req.files.id_image_front[0] && req.files.id_image_front[0].buffer) {
        id_image_front = req.files.id_image_front[0].buffer;
      }
      
      // ID back image
      if (req.files.id_image_back && req.files.id_image_back[0] && req.files.id_image_back[0].buffer) {
        id_image_back = req.files.id_image_back[0].buffer;
      }
    }
    
    const result = await pool.query(
      `INSERT INTO customers (
        first_name, last_name, email, phone,
        address_line1, address_line2, city, state, postal_code, country,
        id_type, id_number, id_expiry_date,
        date_of_birth, status, risk_level, notes, gender, height, weight,
        image, id_image_front, id_image_back, tax_exempt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *, TO_CHAR(date_of_birth, 'YYYY-MM-DD') as date_of_birth, TO_CHAR(id_expiry_date, 'YYYY-MM-DD') as id_expiry_date`,
      [first_name, last_name, email, phone || '',
       address_line1, address_line2, city, state, postal_code, country,
       id_type, id_number, id_expiry_date || null,
       date_of_birth || null, status, risk_level, notes, gender, height || null, weight || null,
       image, id_image_front, id_image_back, taxExemptBool]
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

app.put('/api/customers/:id', uploadCustomerImages, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name, last_name, email, phone,
      address_line1, address_line2, city, state, postal_code, country,
      id_type, id_number, id_expiry_date,
      date_of_birth, status, risk_level, notes, gender, height, weight, tax_exempt
    } = req.body;

    // Convert tax_exempt string to boolean (FormData sends "true"/"false" as strings)
    const taxExemptBool = tax_exempt === 'true' || tax_exempt === true;

    let query, values;
    
    // Initialize image variables
    let image = null;
    let id_image_front = null;
    let id_image_back = null;
    
    // Get files from req.files
    if (req.files) {
      // Main customer photo
      if (req.files.image && req.files.image[0] && req.files.image[0].buffer) {
        image = req.files.image[0].buffer;
      }
      
      // ID front image
      if (req.files.id_image_front && req.files.id_image_front[0] && req.files.id_image_front[0].buffer) {
        id_image_front = req.files.id_image_front[0].buffer;
      }
      
      // ID back image
      if (req.files.id_image_back && req.files.id_image_back[0] && req.files.id_image_back[0].buffer) {
        id_image_back = req.files.id_image_back[0].buffer;
      }
    }
     
    // Check if the form includes image file fields by only looking at req.files
    // This ensures we only update an image field if a new file was actually uploaded
    const hasImageField = req.files && req.files.image;
    const hasIdFrontField = req.files && req.files.id_image_front;
    const hasIdBackField = req.files && req.files.id_image_back;
    
    // Define arrays to track which fields to update and their values
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    // Add basic customer information fields
    updateFields.push(
      `first_name = $${paramCount++}`,
      `last_name = $${paramCount++}`,
      `email = $${paramCount++}`,
      `phone = $${paramCount++}`,
      `address_line1 = $${paramCount++}`,
      `address_line2 = $${paramCount++}`,
      `city = $${paramCount++}`,
      `state = $${paramCount++}`,
      `postal_code = $${paramCount++}`,
      `country = $${paramCount++}`,
      `id_type = $${paramCount++}`,
      `id_number = $${paramCount++}`,
      `id_expiry_date = $${paramCount++}`,
      `date_of_birth = $${paramCount++}`,
      `status = $${paramCount++}`,
      `risk_level = $${paramCount++}`,
      `notes = $${paramCount++}`,
      `gender = $${paramCount++}`,
      `height = $${paramCount++}`,
      `weight = $${paramCount++}`,
      `tax_exempt = $${paramCount++}`
    );

    updateValues.push(
      first_name, last_name, email, phone,
      address_line1, address_line2, city, state, postal_code, country,
      id_type, id_number, id_expiry_date || null,
      date_of_birth || null, status, risk_level, notes, gender, height || null, weight || null,
      taxExemptBool
    );
    
    // Add image fields if provided in the request, either as buffer or null
    // Only update image fields if new files were actually uploaded
    if (hasImageField) {
      updateFields.push(`image = $${paramCount++}`);
      updateValues.push(image);
    }
    
    if (hasIdFrontField) {
      updateFields.push(`id_image_front = $${paramCount++}`);
      updateValues.push(id_image_front);
    }
    
    if (hasIdBackField) {
      updateFields.push(`id_image_back = $${paramCount++}`);
      updateValues.push(id_image_back);
    }
    
    // Add id as the last parameter
    updateValues.push(id);
    
    query = `
      UPDATE customers SET
        ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *, TO_CHAR(date_of_birth, 'YYYY-MM-DD') as date_of_birth, TO_CHAR(id_expiry_date, 'YYYY-MM-DD') as id_expiry_date`;
    values = updateValues;
    // Since we're now handling image updating more dynamically, this else condition is no longer needed

    const result = await pool.query(query, values);

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

// Report Generation API endpoints
app.get('/api/reports/customers/export', async (req, res) => {
  try {
    // Import required PDF and Excel libraries
    const PDFDocument = require('pdfkit');
    const ExcelJS = require('exceljs');
    
    const { format, title, columns, status, risk_level, start_date, end_date, transaction_min, transaction_max } = req.query;
    
    // Get the customer data using the same logic as in the /api/customers endpoint
    let queryParams = [];
    let conditions = [];
    let paramCounter = 1;
    
    let selectFields = '*';
    if (columns) {
      const columnList = columns.split(',').map(col => col.trim());
      if (columnList.length > 0) {
        selectFields = columnList.join(', ');
      }
    }
    
    let query = `SELECT ${selectFields} FROM customers WHERE 1=1`;
    
    if (status) {
      conditions.push(`status = $${paramCounter++}`);
      queryParams.push(status);
    }
    
    if (risk_level) {
      conditions.push(`risk_level = $${paramCounter++}`);
      queryParams.push(risk_level);
    }
    
    if (start_date) {
      conditions.push(`created_at >= $${paramCounter++}`);
      queryParams.push(start_date);
    }
    
    if (end_date) {
      conditions.push(`created_at <= $${paramCounter++}`);
      queryParams.push(end_date);
    }
    
    if (transaction_min) {
      conditions.push(`total_purchase_amount >= $${paramCounter++}`);
      queryParams.push(parseFloat(transaction_min));
    }
    
    if (transaction_max) {
      conditions.push(`total_purchase_amount <= $${paramCounter++}`);
      queryParams.push(parseFloat(transaction_max));
    }
    
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    // Execute the query to get the customer data
    const result = await pool.query(query, queryParams);
    const customers = result.rows;
    
    // Format column names for headers
    const formatColumnName = (column) => {
      return column
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };
    
    // Parse selected columns
    const selectedColumns = columns ? columns.split(',') : Object.keys(customers[0] || {});
    const columnHeaders = selectedColumns.map(formatColumnName);
    
    if (format === 'pdf') {
      // Generate PDF report
      const doc = new PDFDocument({
        margin: 30,
        size: 'A4',
        layout: 'landscape' // Use landscape for more room
      });
      
      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
      
      doc.pipe(res);
      
      // Add title with padding
      doc.fontSize(18).text(title, { align: 'center' });
      doc.moveDown(1);
      
      // Set some constants for table layout
      const margin = 30;
      const availableWidth = doc.page.width - (margin * 2);
      
      // Use all selected columns
      const displayColumns = selectedColumns;
      const displayHeaders = columnHeaders;
      
      // Calculate column widths more intelligently
      // Give each column a minimum width based on the header text length
      const columnWidths = [];
      const minColWidth = 60;
      let totalAllocatedWidth = 0;
      
      // First pass - allocate minimum widths
      displayHeaders.forEach((header) => {
        const width = Math.max(minColWidth, header.length * 7); // Approximate pixel width
        columnWidths.push(width);
        totalAllocatedWidth += width;
      });
      
      // Second pass - distribute remaining space proportionally
      if (totalAllocatedWidth < availableWidth) {
        const extraPerColumn = (availableWidth - totalAllocatedWidth) / displayColumns.length;
        columnWidths.forEach((width, i) => {
          columnWidths[i] += extraPerColumn;
        });
      } else if (totalAllocatedWidth > availableWidth) {
        // Scale down if needed
        const ratio = availableWidth / totalAllocatedWidth;
        columnWidths.forEach((width, i) => {
          columnWidths[i] = width * ratio;
        });
      }
      
      // Start drawing the table
      let x = margin;
      let y = doc.y + 10;
      
      // Draw header background
      doc.rect(margin, y - 5, availableWidth, 25).fill('#f0f0f0');
      doc.fillColor('#000000');
      
      // Draw header texts
      displayHeaders.forEach((header, i) => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(header, x, y, {
              width: columnWidths[i] - 10, // Subtract padding
              align: 'left',
              lineBreak: false
           });
        x += columnWidths[i];
      });
      
      // Reset x and move y down for data rows
      y += 25;
      
      // Draw table rows with alternating background
      customers.forEach((customer, rowIndex) => {
        // Add alternating row background
        if (rowIndex % 2 === 0) {
          doc.rect(margin, y - 5, availableWidth, 20).fill('#f9f9f9');
          doc.fillColor('#000000');
        }
        
        x = margin;
        for (let i = 0; i < displayColumns.length; i++) {
          const column = displayColumns[i];
          let value = customer[column];
          
          // Format special values
          if (value === null || value === undefined) {
            value = '-';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          } else if (typeof value === 'string' && value.length > 25) {
            // Truncate long text
            value = value.substring(0, 22) + '...';
          }
          
          // Draw cell text
          doc.fontSize(8)
             .font('Helvetica')
             .text(String(value), x, y, {
                width: columnWidths[i] - 10, // Subtract padding
                align: 'left',
                lineBreak: false
             });
             
          x += columnWidths[i];
        }
        
        y += 30; // Move to the next row with increased spacing
        
        // Start a new page if we're near the bottom AND there are more records to display
        if (y > doc.page.height - 50 && rowIndex < customers.length - 1) {
          doc.addPage();
          y = margin;
          
          // Re-draw the header on the new page
          x = margin;
          doc.rect(margin, y - 5, availableWidth, 25).fill('#f0f0f0');
          doc.fillColor('#000000');
          
          displayHeaders.forEach((header, i) => {
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .text(header, x, y, {
                  width: columnWidths[i] - 10,
                  align: 'left',
                  lineBreak: false
               });
            x += columnWidths[i];
          });
          
          y += 25;
        }
      });
      
      // No additional columns page - all columns are already displayed
      
      // Finalize the PDF
      doc.end();
      
    } else if (format === 'excel') {
      // Generate Excel report
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(title);
      
      // Add column headers
      worksheet.addRow(columnHeaders);
      
      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      
      // Add data rows
      customers.forEach(customer => {
        const rowData = selectedColumns.map(column => {
          let value = customer[column];
          
          // Format special values
          if (value === null || value === undefined) {
            return '-';
          } else if (typeof value === 'object') {
            return JSON.stringify(value);
          }
          
          return value;
        });
        
        worksheet.addRow(rowData);
      });
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });
      
      // Set response headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx"`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Unsupported format
      res.status(400).json({ error: 'Unsupported export format. Use pdf or excel.' });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get transaction items for a specific transaction
app.get('/api/transactions/:transaction_id/items', async (req, res) => {
  try {
    const { transaction_id } = req.params;
    
    // First, get all transaction items
    const query = `
      WITH item_list AS (
        SELECT 
          ti.id,
          ti.transaction_id,
          ti.item_id as transaction_item_id,
          ti.item_price,
          ti.created_at,
          ti.updated_at,
          tt.type as transaction_type,
          j.item_id as jewelry_item_id,
          j.long_desc,
          j.short_desc,
          j.category,
          j.metal_weight,
          j.precious_metal_type,
          j.non_precious_metal_type,
          j.metal_purity,
          j.purity_value,
          j.jewelry_color,
          j.metal_spot_price,
          j.est_metal_value,
          j.images,
          j.status as item_status,
          j.primary_gem_type,
          j.primary_gem_category,
          j.primary_gem_size,
          j.primary_gem_weight,
          j.primary_gem_quantity,
          j.primary_gem_shape,
          j.primary_gem_color,
          j.primary_gem_exact_color,
          j.primary_gem_clarity,
          j.primary_gem_cut,
          j.primary_gem_lab_grown,
          j.primary_gem_authentic,
          j.primary_gem_value,
          EXISTS (
            SELECT * FROM jewelry_secondary_gems jsg 
            WHERE jsg.item_id = ti.item_id
          ) as has_secondary_gems
        FROM transaction_items ti
        JOIN transaction_type tt ON ti.transaction_type_id = tt.id
        LEFT JOIN jewelry j ON ti.item_id = j.item_id
        WHERE ti.transaction_id = $1
      )
      SELECT 
        il.*,
        (
          SELECT COALESCE(
            json_agg(jsg.*) FILTER (WHERE jsg.item_id IS NOT NULL),
            '[]'::json
          )
          FROM jewelry_secondary_gems jsg 
          WHERE jsg.item_id = il.transaction_item_id
        ) as secondary_gems
      FROM item_list il
      ORDER BY il.created_at ASC
    `;
    
    const result = await pool.query(query, [transaction_id]);
    
    // Transform the result to a more usable format
    const items = result.rows.map(row => {
      const primaryGem = (() => {
        if (!row.primary_gem_category) return null;
        
        const baseProps = {
          shape: row.primary_gem_shape,
          color: row.primary_gem_color,
          weight: row.primary_gem_weight,
          quantity: row.primary_gem_quantity,
          value: row.primary_gem_value
        };

        if (row.primary_gem_category === 'diamond') {
          return {
            ...baseProps,
            size: row.primary_gem_size,
            exact_color: row.primary_gem_exact_color,
            clarity: row.primary_gem_clarity,
            cut: row.primary_gem_cut,
            lab_grown: row.primary_gem_lab_grown,
          };
        }
        
        if (row.primary_gem_category === 'stone') {
          return {
            ...baseProps,
            type: row.primary_gem_type,
            authentic: row.primary_gem_authentic
          };
        }
        
        return baseProps;
      })();

      // Process secondary gems if they exist
      const secondaryGems = row.secondary_gems ? row.secondary_gems.map(gem => ({
        shape: gem.secondary_gem_shape,
        color: gem.secondary_gem_color,
        weight: gem.secondary_gem_weight,
        quantity: gem.secondary_gem_quantity,
        value: gem.secondary_gem_value,
        ...(gem.secondary_gem_category === 'diamond' ? {
          size: gem.secondary_gem_size,
          exact_color: gem.secondary_gem_exact_color,
          clarity: gem.secondary_gem_clarity,
          cut: gem.secondary_gem_cut,
          lab_grown: gem.secondary_gem_lab_grown
        } : {
          type: gem.secondary_gem_type,
          authentic: gem.secondary_gem_authentic
        })
      })) : [];

      return {
        id: row.id,
        transaction_id: row.transaction_id,
        item_id: row.transaction_item_id,
        item_price: row.item_price,
        notes: row.notes || '',
        transaction_type: row.transaction_type,
        item_details: {
          item_id: row.jewelry_item_id,
          description: row.long_desc || row.short_desc || '',
          category: row.category,
          images: row.images || [],
        metal: {
          precious_metal_type: row.precious_metal_type,
          non_precious_metal_type: row.non_precious_metal_type,
          purity: row.metal_purity,
          purity_value: row.purity_value,
          weight: row.metal_weight,
          color: row.jewelry_color,
          spot_price: row.metal_spot_price,
          value: row.est_metal_value
        },
        primary_gem: primaryGem,
        secondary_gems: secondaryGems,
        status: row.item_status,
        images: row.images || []
      },
      created_at: row.created_at,
      updated_at: row.updated_at
    }});
    
    res.json(items);
  } catch (err) {
    console.error('Error fetching transaction items:', err);
    res.status(500).json({ error: 'Failed to fetch transaction items' });
  }
});

// Get payments for a specific transaction
app.get('/api/transactions/:transaction_id/payments', async (req, res) => {
  try {
    const { transaction_id } = req.params;
    
    // First, verify the transaction exists
    const transactionCheck = await pool.query(
      'SELECT transaction_id FROM transactions WHERE transaction_id = $1',
      [transaction_id]
    );
    
    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Get all payments for the transaction
    const result = await pool.query(
      `SELECT 
        id,
        amount,
        payment_method,
        created_at,
        updated_at
      FROM payments 
      WHERE transaction_id = $1
      ORDER BY created_at`,
      [transaction_id]
    );
    
    res.json({
      transaction_id,
      payments: result.rows,
      total_paid: result.rows.reduce((sum, payment) => sum + parseFloat(payment.amount), 0)
    });
    
  } catch (err) {
    console.error('Error fetching transaction payments:', err);
    res.status(500).json({ error: 'Failed to fetch transaction payments' });
  }
});

// Update payment methods for a transaction
app.put('/api/transactions/:transaction_id/payments', async (req, res) => {
  const client = await pool.connect();
  try {
    const { transaction_id } = req.params;
    const { payments } = req.body;

    // Validate input
    if (!payments || !Array.isArray(payments)) {
      return res.status(400).json({ error: 'Invalid payments data' });
    }

    // Verify the transaction exists
    const transactionCheck = await client.query(
      'SELECT transaction_id FROM transactions WHERE transaction_id = $1',
      [transaction_id]
    );

    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await client.query('BEGIN');

    // Delete existing payments for this transaction
    await client.query(
      'DELETE FROM payments WHERE transaction_id = $1',
      [transaction_id]
    );

    // Insert new payments
    for (const payment of payments) {
      await client.query(
        'INSERT INTO payments (transaction_id, amount, payment_method) VALUES ($1, $2, $3)',
        [transaction_id, payment.amount, payment.payment_method]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Payment methods updated successfully'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating transaction payments:', err);
    res.status(500).json({ error: 'Failed to update payment methods' });
  } finally {
    client.release();
  }
});

// Transaction routes
app.get('/api/transactions', async (req, res) => {
  try {
    // First, get the grouped transaction data with item counts
    const query = `
      WITH transaction_items_count AS (
        SELECT 
          ti.transaction_id,
          COUNT(*) as item_count
        FROM transaction_items ti
        GROUP BY ti.transaction_id
      )
      SELECT
        t.transaction_id as id,
        t.transaction_id,
        t.customer_id,
        c.first_name || ' ' || c.last_name as customer_name,
        c.phone as customer_phone,
        TRIM(CONCAT_WS(', ',
          NULLIF(c.address_line1, ''),
          NULLIF(c.address_line2, ''),
          NULLIF(CONCAT_WS(', ',
            NULLIF(c.city, ''),
            NULLIF(c.state, ''),
            NULLIF(c.postal_code, '')
          ), '')
        )) as customer_address,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_id,
        t.total_amount,
        t.created_at,
        t.updated_at,
        TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_created_at,
        COALESCE(tic.item_count, 0) as item_count
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN employees e ON t.employee_id = e.employee_id
      LEFT JOIN transaction_items_count tic ON t.transaction_id = tic.transaction_id
      GROUP BY
        t.transaction_id, t.customer_id, c.first_name, c.last_name, c.phone,
        c.address_line1, c.address_line2, c.city, c.state, c.postal_code,
        e.first_name, e.last_name, e.employee_id, t.total_amount,
        t.created_at, t.updated_at, tic.item_count
      ORDER BY t.created_at DESC`;
    
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
    
    const transactionQuery = `
      SELECT 
        t.*,
        tt.type as transaction_type_name,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name,
        c.email as customer_email,
        c.phone as customer_phone,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        p.payment_id as payment_reference,
        p.payment_method,
        p.amount as payment_amount
      FROM transactions t
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.id
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN employees e ON t.employee_id = e.employee_id
      LEFT JOIN payments p ON t.payment_id = p.id
      WHERE t.id = $1
    `;

    const transactionResult = await pool.query(transactionQuery, [id]);
    
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transactionResult.rows[0]);
  } catch (err) {
    console.error('Error fetching transaction:', err);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

app.post('/api/transactions', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const {
            customer_id,
            employee_id,
            total_amount,
            cartItems,
            transaction_date = new Date().toISOString().split('T')[0]
        } = req.body;

        // Required fields validation
        if (!customer_id || !employee_id || !total_amount || !cartItems || !cartItems.length) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await client.query('BEGIN');

        // Generate unique transaction ID
        const transactionId = await generateTransactionId();

        // Insert main transaction record
        const transactionQuery = `
            INSERT INTO transactions (
                transaction_id, customer_id, employee_id,
                total_amount, transaction_date
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const transactionResult = await client.query(transactionQuery, [
            transactionId,
            customer_id,
            employee_id,
            total_amount,
            transaction_date
        ]);

        // Insert items into transaction_items
        for (const item of cartItems) {
            // Handle both jewelry items (with item_id) and non-jewelry items (without item_id)
            const itemQuery = item.item_id
                ? `INSERT INTO transaction_items (
                      transaction_id, item_id, transaction_type_id, item_price
                  ) VALUES ($1, $2, $3, $4) RETURNING *`
                : `INSERT INTO transaction_items (
                      transaction_id, transaction_type_id, item_price, description
                  ) VALUES ($1, $2, $3, $4) RETURNING *`;

            const params = item.item_id
                ? [transactionId, item.item_id, item.transaction_type_id, item.price]
                : [transactionId, item.transaction_type_id, item.price, item.description || 'Item'];

            await client.query(itemQuery, params);
        }

        await client.query('COMMIT');
        
        res.status(201).json({
            message: 'Transaction created successfully',
            transaction: transactionResult.rows[0],
            items: cartItems
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating transaction:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Delete a transaction and all its related data
app.delete('/api/transactions/:transaction_id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { transaction_id } = req.params;
    
    await client.query('BEGIN');
    
    // 1. Delete from payments first (due to foreign key constraints)
    await client.query('DELETE FROM payments WHERE transaction_id = $1', [transaction_id]);
    
    // 2. Delete from transaction_items
    await client.query('DELETE FROM transaction_items WHERE transaction_id = $1', [transaction_id]);
    
    // 3. Finally, delete the transaction
    await client.query('DELETE FROM transactions WHERE transaction_id = $1', [transaction_id]);
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Transaction and all related data deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting transaction:', err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  } finally {
    client.release();
  }
});

// Get customer sales history
app.get('/api/customers/:customer_id/sales-history', async (req, res) => {
  try {
    const { customer_id } = req.params;

    // Query to get all transactions for a specific customer with details
    const query = `
      WITH transaction_items_count AS (
        SELECT
          ti.transaction_id,
          COUNT(*) as item_count,
          STRING_AGG(DISTINCT tt.type, ', ') as transaction_types
        FROM transaction_items ti
        LEFT JOIN transaction_type tt ON ti.transaction_type_id = tt.id
        GROUP BY ti.transaction_id
      ),
      transaction_payments AS (
        SELECT
          p.transaction_id,
          SUM(p.amount) as total_paid,
          STRING_AGG(DISTINCT p.payment_method, ', ') as payment_methods
        FROM payments p
        GROUP BY p.transaction_id
      )
      SELECT
        t.transaction_id,
        t.total_amount,
        t.transaction_date,
        t.created_at,
        t.updated_at,
        TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_date,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        e.first_name || ' ' || e.last_name as employee_name,
        COALESCE(tic.item_count, 0) as item_count,
        COALESCE(tic.transaction_types, 'N/A') as transaction_types,
        COALESCE(tp.total_paid, 0) as total_paid,
        COALESCE(tp.payment_methods, 'N/A') as payment_methods,
        (t.total_amount - COALESCE(tp.total_paid, 0)) as balance_due
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN employees e ON t.employee_id = e.employee_id
      LEFT JOIN transaction_items_count tic ON t.transaction_id = tic.transaction_id
      LEFT JOIN transaction_payments tp ON t.transaction_id = tp.transaction_id
      WHERE t.customer_id = $1
      ORDER BY t.created_at DESC
    `;

    const result = await pool.query(query, [customer_id]);

    // Calculate summary statistics
    const summary = {
      total_transactions: result.rows.length,
      total_spent: result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0),
      total_paid: result.rows.reduce((sum, row) => sum + parseFloat(row.total_paid), 0),
      outstanding_balance: result.rows.reduce((sum, row) => sum + parseFloat(row.balance_due), 0)
    };

    res.json({
      customer_id: parseInt(customer_id),
      summary: summary,
      transactions: result.rows
    });
  } catch (err) {
    console.error('Error fetching customer sales history:', err);
    res.status(500).json({ error: 'Failed to fetch customer sales history' });
  }
});

// Customer Account Linking API Endpoints

// Get all linked accounts for a customer
app.get('/api/customers/:id/linked-accounts', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        cal.id,
        cal.primary_customer_id,
        cal.linked_customer_id,
        cal.link_type,
        cal.is_active,
        cal.created_at,
        cal.notes,
        c.first_name || ' ' || c.last_name as linked_customer_name,
        c.email as linked_customer_email,
        c.phone as linked_customer_phone,
        e.first_name || ' ' || e.last_name as created_by_name
      FROM customer_account_links cal
      LEFT JOIN customers c ON cal.linked_customer_id = c.id
      LEFT JOIN employees e ON cal.created_by = e.employee_id
      WHERE cal.primary_customer_id = $1
      ORDER BY cal.created_at DESC
    `;

    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching linked accounts:', err);
    res.status(500).json({ error: 'Failed to fetch linked accounts' });
  }
});

// Create a new account link
app.post('/api/customers/:id/link-account', async (req, res) => {
  try {
    const { id } = req.params;
    const { linked_customer_id, link_type, created_by, notes } = req.body;

    // Validate input
    if (!linked_customer_id) {
      return res.status(400).json({ error: 'linked_customer_id is required' });
    }

    // Prevent self-linking
    if (parseInt(id) === parseInt(linked_customer_id)) {
      return res.status(400).json({ error: 'Cannot link account to itself' });
    }

    // Check if both customers exist
    const customerCheck = await pool.query(
      'SELECT id FROM customers WHERE id IN ($1, $2)',
      [id, linked_customer_id]
    );

    if (customerCheck.rows.length !== 2) {
      return res.status(404).json({ error: 'One or both customers not found' });
    }

    // Check if link already exists
    const existingLink = await pool.query(
      'SELECT id FROM customer_account_links WHERE primary_customer_id = $1 AND linked_customer_id = $2',
      [id, linked_customer_id]
    );

    if (existingLink.rows.length > 0) {
      return res.status(409).json({ error: 'Account link already exists' });
    }

    // Create the link
    const insertQuery = `
      INSERT INTO customer_account_links (
        primary_customer_id, linked_customer_id, link_type, created_by, notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      id,
      linked_customer_id,
      link_type || 'full_access',
      created_by,
      notes
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating account link:', err);
    res.status(500).json({ error: 'Failed to create account link' });
  }
});

// Update an account link
app.put('/api/customers/account-links/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;
    const { link_type, is_active, notes } = req.body;

    const updateQuery = `
      UPDATE customer_account_links
      SET link_type = COALESCE($1, link_type),
          is_active = COALESCE($2, is_active),
          notes = COALESCE($3, notes)
      WHERE id = $4
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [link_type, is_active, notes, linkId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account link not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating account link:', err);
    res.status(500).json({ error: 'Failed to update account link' });
  }
});

// Delete (unlink) an account link
app.delete('/api/customers/account-links/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;

    const deleteQuery = 'DELETE FROM customer_account_links WHERE id = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [linkId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account link not found' });
    }

    res.json({ message: 'Account link deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting account link:', err);
    res.status(500).json({ error: 'Failed to delete account link' });
  }
});

// Get linked account authorization template(s)
app.get('/api/linked-account-authorization-template', async (req, res) => {
  try {
    const { link_type } = req.query;

    if (link_type) {
      // Fetch specific template for a link type
      const query = 'SELECT * FROM linked_account_authorization_template WHERE link_type = $1';
      const result = await pool.query(query, [link_type]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Authorization template not found for this link type' });
      }

      res.json(result.rows[0]);
    } else {
      // Fetch all templates (for SystemConfig)
      const query = 'SELECT * FROM linked_account_authorization_template ORDER BY link_type';
      const result = await pool.query(query);
      res.json(result.rows);
    }
  } catch (err) {
    console.error('Error fetching authorization template:', err);
    res.status(500).json({ error: 'Failed to fetch authorization template' });
  }
});

// Update linked account authorization template
app.put('/api/linked-account-authorization-template/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { form_title, form_content, consent_text } = req.body;

    const updateQuery = `
      UPDATE linked_account_authorization_template
      SET form_title = $1, form_content = $2, consent_text = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [form_title, form_content, consent_text, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Authorization template not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating authorization template:', err);
    res.status(500).json({ error: 'Failed to update authorization template' });
  }
});

// Save authorization for linked account
app.post('/api/linked-account-authorization', async (req, res) => {
  try {
    const { link_id, customer_id, authorized_by_name, signature_data, ip_address, user_agent } = req.body;

    const insertQuery = `
      INSERT INTO linked_account_authorizations
      (link_id, customer_id, authorized_by_name, signature_data, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      link_id,
      customer_id,
      authorized_by_name,
      signature_data,
      ip_address,
      user_agent
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error saving authorization:', err);
    res.status(500).json({ error: 'Failed to save authorization' });
  }
});

// Get all transactions accessible by a customer (including linked accounts)
app.get('/api/customers/:id/all-accessible-transactions', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      WITH accessible_customers AS (
        -- Include the customer's own ID
        SELECT $1::integer as customer_id
        UNION
        -- Include linked customer IDs
        SELECT linked_customer_id
        FROM customer_account_links
        WHERE primary_customer_id = $1 AND is_active = true
      ),
      transaction_items_count AS (
        SELECT
          ti.transaction_id,
          COUNT(*) as item_count,
          STRING_AGG(DISTINCT tt.type, ', ') as transaction_types
        FROM transaction_items ti
        LEFT JOIN transaction_type tt ON ti.transaction_type_id = tt.id
        GROUP BY ti.transaction_id
      ),
      transaction_payments AS (
        SELECT
          p.transaction_id,
          SUM(p.amount) as total_paid,
          STRING_AGG(DISTINCT p.payment_method, ', ') as payment_methods
        FROM payments p
        GROUP BY p.transaction_id
      )
      SELECT
        t.transaction_id,
        t.customer_id,
        t.total_amount,
        t.transaction_date,
        t.created_at,
        t.updated_at,
        TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_date,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        e.first_name || ' ' || e.last_name as employee_name,
        COALESCE(tic.item_count, 0) as item_count,
        COALESCE(tic.transaction_types, 'N/A') as transaction_types,
        COALESCE(tp.total_paid, 0) as total_paid,
        COALESCE(tp.payment_methods, 'N/A') as payment_methods,
        (t.total_amount - COALESCE(tp.total_paid, 0)) as balance_due,
        CASE WHEN t.customer_id = $1 THEN false ELSE true END as is_linked_account
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN employees e ON t.employee_id = e.employee_id
      LEFT JOIN transaction_items_count tic ON t.transaction_id = tic.transaction_id
      LEFT JOIN transaction_payments tp ON t.transaction_id = tp.transaction_id
      WHERE t.customer_id IN (SELECT customer_id FROM accessible_customers)
      ORDER BY t.created_at DESC
    `;

    const result = await pool.query(query, [id]);

    // Calculate summary statistics
    const summary = {
      total_transactions: result.rows.length,
      own_transactions: result.rows.filter(row => !row.is_linked_account).length,
      linked_transactions: result.rows.filter(row => row.is_linked_account).length,
      total_spent: result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0),
      total_paid: result.rows.reduce((sum, row) => sum + parseFloat(row.total_paid), 0),
      outstanding_balance: result.rows.reduce((sum, row) => sum + parseFloat(row.balance_due), 0)
    };

    res.json({
      customer_id: parseInt(id),
      summary: summary,
      transactions: result.rows
    });
  } catch (err) {
    console.error('Error fetching accessible transactions:', err);
    res.status(500).json({ error: 'Failed to fetch accessible transactions' });
  }
});

// Tax Configuration API Endpoints
app.get('/api/tax-config', async (req, res) => {
  try {
    const query = 'SELECT * FROM tax_config ORDER BY province_name';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tax configuration:', error);
    res.status(500).json({ error: 'Failed to fetch tax configuration' });
  }
});

app.get('/api/tax-config/:province_code', async (req, res) => {
  try {
    const { province_code } = req.params;
    const query = 'SELECT * FROM tax_config WHERE province_code = $1';
    const result = await pool.query(query, [province_code.toUpperCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Province not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tax configuration for province:', error);
    res.status(500).json({ error: 'Failed to fetch tax configuration' });
  }
});

app.put('/api/tax-config/batch', async (req, res) => {
  const client = await pool.connect();
  try {
    const { taxRates } = req.body; // Array of { province_code, gst_rate, pst_rate, hst_rate }

    await client.query('BEGIN');

    const updatedRates = [];
    for (const rate of taxRates) {
      const query = `
        UPDATE tax_config
        SET gst_rate = $1, pst_rate = $2, hst_rate = $3, updated_at = CURRENT_TIMESTAMP
        WHERE province_code = $4
        RETURNING *
      `;

      const result = await client.query(query, [
        rate.gst_rate,
        rate.pst_rate,
        rate.hst_rate,
        rate.province_code
      ]);

      if (result.rows.length > 0) {
        updatedRates.push(result.rows[0]);
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Tax rates updated successfully', updated: updatedRates });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating tax configuration batch:', error);
    res.status(500).json({ error: 'Failed to update tax configuration' });
  } finally {
    client.release();
  }
});

// Customer Dashboard API Endpoint
app.get('/api/customer-dashboard', async (req, res) => {
  try {
    // Get total customers
    const totalCustomersQuery = 'SELECT COUNT(*) as total FROM customers';
    const totalCustomersResult = await pool.query(totalCustomersQuery);
    const totalCustomers = parseInt(totalCustomersResult.rows[0].total);

    // Get new customers this month
    const newCustomersQuery = `
      SELECT COUNT(*) as total
      FROM customers
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    const newCustomersResult = await pool.query(newCustomersQuery);
    const newCustomersThisMonth = parseInt(newCustomersResult.rows[0].total);

    // Get total transactions and revenue
    const transactionsQuery = `
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM transactions
    `;
    const transactionsResult = await pool.query(transactionsQuery);
    const totalTransactions = parseInt(transactionsResult.rows[0].total_transactions);
    const totalRevenue = parseFloat(transactionsResult.rows[0].total_revenue);
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Get top customers by revenue
    const topCustomersQuery = `
      SELECT
        c.id,
        CONCAT(c.first_name, ' ', c.last_name) as name,
        c.tax_exempt,
        COUNT(t.transaction_id) as transaction_count,
        COALESCE(SUM(t.total_amount), 0) as total_spent
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customer_id
      GROUP BY c.id, c.first_name, c.last_name, c.tax_exempt
      HAVING COUNT(t.transaction_id) > 0
      ORDER BY total_spent DESC
      LIMIT 10
    `;
    const topCustomersResult = await pool.query(topCustomersQuery);

    // Get recent customer activity
    const recentCustomersQuery = `
      SELECT
        c.id,
        CONCAT(c.first_name, ' ', c.last_name) as name,
        c.email,
        MAX(t.transaction_date) as last_transaction_date,
        (
          SELECT total_amount
          FROM transactions
          WHERE customer_id = c.id
          ORDER BY transaction_date DESC
          LIMIT 1
        ) as last_transaction_amount
      FROM customers c
      INNER JOIN transactions t ON c.id = t.customer_id
      GROUP BY c.id, c.first_name, c.last_name, c.email
      ORDER BY last_transaction_date DESC
      LIMIT 10
    `;
    const recentCustomersResult = await pool.query(recentCustomersQuery);

    // Get inactive customers (no activity in 90+ days)
    const inactiveCustomersQuery = `
      SELECT
        c.id,
        CONCAT(c.first_name, ' ', c.last_name) as name,
        c.phone,
        c.email,
        MAX(t.transaction_date) as last_transaction_date,
        CURRENT_DATE - MAX(t.transaction_date)::date as days_inactive,
        COALESCE(SUM(t.total_amount), 0) as total_spent
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customer_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email
      HAVING MAX(t.transaction_date) IS NOT NULL
        AND (CURRENT_DATE - MAX(t.transaction_date)::date) >= 90
      ORDER BY days_inactive DESC
      LIMIT 20
    `;
    const inactiveCustomersResult = await pool.query(inactiveCustomersQuery);

    res.json({
      totalCustomers,
      newCustomersThisMonth,
      totalTransactions,
      totalRevenue,
      averageTransactionValue,
      topCustomers: topCustomersResult.rows,
      recentCustomers: recentCustomersResult.rows,
      inactiveCustomers: inactiveCustomersResult.rows
    });
  } catch (error) {
    console.error('Error fetching customer dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
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

// Get all payment methods
app.get('/api/payment-methods', async (req, res) => {
  try {
    const query = 'SELECT * FROM payment_methods WHERE is_active = true ORDER BY id';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
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

// Jewelry Secondary Gems API Endpoints
app.get('/api/jewelry_secondary_gems', async (req, res) => {
  try {
    const query = 'SELECT * FROM jewelry_secondary_gems ORDER BY created_at DESC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all jewelry secondary gems:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/jewelry_secondary_gems/:item_id', async (req, res) => {
  try {
    const { item_id } = req.params;
    const query = 'SELECT * FROM jewelry_secondary_gems WHERE item_id = $1';
    const result = await pool.query(query, [item_id]);
    
    // Return all matching secondary gems (can be empty array if none found)
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching jewelry secondary gems:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/jewelry_secondary_gems/:item_id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { item_id } = req.params;
    
    // Check if the item exists in the jewelry table
    const checkItemQuery = 'SELECT item_id FROM jewelry WHERE item_id = $1';
    const itemExists = await client.query(checkItemQuery, [item_id]);
    
    if (itemExists.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Jewelry item not found' });
    }
    
    // Check if record exists in secondary gems table
    const checkQuery = 'SELECT item_id FROM jewelry_secondary_gems WHERE item_id = $1';
    const exists = await client.query(checkQuery, [item_id]);
    
    let result;
    if (exists.rows.length > 0) {
      // Update existing record
      const updateQuery = `
        UPDATE jewelry_secondary_gems
        SET 
          secondary_gem_type = $1,
          secondary_gem_category = $2,
          secondary_gem_size = $3,
          secondary_gem_quantity = $4,
          secondary_gem_shape = $5,
          secondary_gem_weight = $6,
          secondary_gem_color = $7,
          secondary_gem_exact_color = $8,
          secondary_gem_clarity = $9,
          secondary_gem_cut = $10,
          secondary_gem_lab_grown = $11,
          secondary_gem_authentic = $12,
          secondary_gem_value = $13
        WHERE item_id = $14
        RETURNING *
      `;
      
      result = await client.query(updateQuery, [
        req.body.secondary_gem_type || null,
        req.body.secondary_gem_category || null,
        req.body.secondary_gem_size || null,
        parseInt(req.body.secondary_gem_quantity) || 0,
        req.body.secondary_gem_shape || null,
        parseFloat(req.body.secondary_gem_weight) || null,
        req.body.secondary_gem_color || null,
        req.body.secondary_gem_exact_color || null,
        req.body.secondary_gem_clarity || null,
        req.body.secondary_gem_cut || null,
        req.body.secondary_gem_lab_grown === true || req.body.secondary_gem_lab_grown === 'true',
        req.body.secondary_gem_authentic === true || req.body.secondary_gem_authentic === 'true',
        parseFloat(req.body.secondary_gem_value) || null,
        item_id
      ]);
    } else {
      // Insert new record
      const insertQuery = `
        INSERT INTO jewelry_secondary_gems (
          item_id,
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
          secondary_gem_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      result = await client.query(insertQuery, [
        item_id,
        req.body.secondary_gem_type || null,
        req.body.secondary_gem_category || null,
        parseFloat(req.body.secondary_gem_size) || null,
        parseInt(req.body.secondary_gem_quantity) || 0,
        req.body.secondary_gem_shape || null,
        parseFloat(req.body.secondary_gem_weight) || null,
        req.body.secondary_gem_color || null,
        req.body.secondary_gem_exact_color || null,
        req.body.secondary_gem_clarity || null,
        req.body.secondary_gem_cut || null,
        req.body.secondary_gem_lab_grown === true,
        req.body.secondary_gem_authentic === true,
        parseFloat(req.body.secondary_gem_value) || null
      ]);
    }
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating jewelry secondary gems:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Jewelry Secondary Gems endpoint
app.post('/api/jewelry_secondary_gems', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Extract all fields from the request body
    const { jewelry_id } = req.body;
    
    // Validate required fields
    if (!jewelry_id) {
      throw new Error('jewelry_id is required');
    }
    
    // Check if jewelry item exists
    const jewelryCheck = await client.query(
      'SELECT item_id FROM jewelry WHERE item_id = $1',
      [jewelry_id]
    );
    
    if (jewelryCheck.rows.length === 0) {
      throw new Error(`Jewelry item with ID ${jewelry_id} does not exist`);
    }
    
    // Insert secondary gem record
    const query = `
      INSERT INTO jewelry_secondary_gems (
        item_id, 
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
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
      ) RETURNING *
    `;
    
    const result = await client.query(query, [
      jewelry_id,
      req.body.secondary_gem_type || null,
      req.body.secondary_gem_category || null,
      parseFloat(req.body.secondary_gem_size) || null,
      parseInt(req.body.secondary_gem_quantity) || 0,
      req.body.secondary_gem_shape || null,
      parseFloat(req.body.secondary_gem_weight) || null,
      req.body.secondary_gem_color || null,
      req.body.secondary_gem_exact_color || null,
      req.body.secondary_gem_clarity || null,
      req.body.secondary_gem_cut || null,
      req.body.secondary_gem_lab_grown === true,
      req.body.secondary_gem_authentic === true,
      parseFloat(req.body.secondary_gem_value) || null
    ]);
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving jewelry secondary gem:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Scrap Bucket API Endpoints

// GET all scrap buckets
app.get('/api/scrap/buckets', async (req, res) => {
  try {
    const query = `
      SELECT
        bucket_id,
        bucket_name,
        item_id,
        jsonb_array_length(item_id) as item_count,
        created_at,
        updated_at,
        notes,
        status,
        refiner_customer_id,
        shipper,
        tracking_number,
        date_received,
        weight_received,
        locked_spot_price,
        payment_advance,
        final_weight,
        assay,
        total_settlement_amount,
        final_payment_amount
      FROM scrap
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching scrap buckets:', err);
    res.status(500).json({ error: 'Failed to fetch scrap buckets' });
  }
});

// GET a single scrap bucket by ID
app.get('/api/scrap/buckets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        s.*,
        jsonb_agg(
          jsonb_build_object(
            'item_id', j.item_id,
            'description', j.description,
            'metal_type', j.metal_type,
            'purity', j.purity,
            'weight', j.weight
          )
        ) as items
      FROM scrap s
      LEFT JOIN LATERAL (
        SELECT * 
        FROM jewelry j 
        WHERE j.item_id = ANY(ARRAY(SELECT jsonb_array_elements_text(s.item_id)))
      ) j ON true
      WHERE s.bucket_id = $1
      GROUP BY s.bucket_id
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scrap bucket not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching scrap bucket:', err);
    res.status(500).json({ error: 'Failed to fetch scrap bucket' });
  }
});

// CREATE a new scrap bucket
app.post('/api/scrap/buckets', async (req, res) => {
  const client = await pool.connect();
  try {
    const { bucket_name, notes, created_by } = req.body;
    
    if (!bucket_name) {
      return res.status(400).json({ error: 'Bucket name is required' });
    }
    
    await client.query('BEGIN');
    
    const query = `
      INSERT INTO scrap (
        bucket_name,
        item_id,
        created_by,
        notes,
        status
      ) VALUES ($1, '[]'::jsonb, $2, $3, 'ACTIVE')
      RETURNING *
    `;
    
    const result = await client.query(query, [
      bucket_name,
      created_by || null,
      notes || null
    ]);
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
    
  } catch (err) {
    await client.query('ROLLBACK');
    
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'A bucket with this name already exists' });
    }
    
    console.error('Error creating scrap bucket:', err);
    res.status(500).json({ error: 'Failed to create scrap bucket' });
  } finally {
    client.release();
  }
});

// UPDATE a scrap bucket
app.put('/api/scrap/buckets/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { bucket_name, notes, status, item_id, updated_by, refiner_customer_id, shipper, tracking_number, date_received, weight_received, locked_spot_price, payment_advance, final_weight, assay, total_settlement_amount, final_payment_amount } = req.body;

    await client.query('BEGIN');

    // First check if the bucket exists
    const checkQuery = 'SELECT * FROM scrap WHERE bucket_id = $1';
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Scrap bucket not found' });
    }

    const existingBucket = checkResult.rows[0];

    // If status is being changed to COMPLETE, update all items in the bucket to 'SOLD TO REFINER'
    if (status === 'COMPLETE' && existingBucket.status !== 'COMPLETE') {
      const itemIds = existingBucket.item_id;

      if (itemIds && itemIds.length > 0) {
        // Get employee ID from request body or use a default value (1 for system)
        const employeeId = updated_by || 1;

        // Update each item's status to 'SOLD TO REFINER'
        for (const itemId of itemIds) {
          // Get current item details
          const itemResult = await client.query(
            'SELECT status FROM jewelry WHERE item_id = $1',
            [itemId]
          );

          if (itemResult.rows.length > 0) {
            const oldStatus = itemResult.rows[0].status;

            // Update jewelry item status to 'SOLD TO REFINER'
            await client.query(
              `UPDATE jewelry SET status = 'SOLD TO REFINER', updated_at = CURRENT_TIMESTAMP WHERE item_id = $1`,
              [itemId]
            );

            // Get the next version number for history
            const versionResult = await client.query(
              'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM jewelry_item_history WHERE item_id = $1',
              [itemId]
            );
            const version_number = versionResult.rows[0].next_version;

            // Log the status change in jewelry_item_history
            const changedFields = {
              status: { old: oldStatus, new: 'SOLD TO REFINER' }
            };

            await client.query(
              `INSERT INTO jewelry_item_history (
                item_id, version_number, changed_by, action_type, changed_fields, change_notes
              ) VALUES ($1, $2, $3, 'STATUS_CHANGE', $4, 'Item sold to refiner from bucket: ' || $5)`,
              [itemId, version_number, employeeId, changedFields, existingBucket.bucket_name]
            );
          }
        }
      }
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (bucket_name !== undefined) {
      updates.push(`bucket_name = $${paramCount}`);
      values.push(bucket_name);
      paramCount++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(notes || null);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (item_id !== undefined) {
      updates.push(`item_id = $${paramCount}`);
      values.push(JSON.stringify(item_id));
      paramCount++;
    }

    if (refiner_customer_id !== undefined) {
      updates.push(`refiner_customer_id = $${paramCount}`);
      values.push(refiner_customer_id || null);
      paramCount++;
    }

    if (shipper !== undefined) {
      updates.push(`shipper = $${paramCount}`);
      values.push(shipper || null);
      paramCount++;
    }

    if (tracking_number !== undefined) {
      updates.push(`tracking_number = $${paramCount}`);
      values.push(tracking_number || null);
      paramCount++;
    }

    if (date_received !== undefined) {
      updates.push(`date_received = $${paramCount}`);
      values.push(date_received || null);
      paramCount++;
    }

    if (weight_received !== undefined) {
      updates.push(`weight_received = $${paramCount}`);
      values.push(weight_received || null);
      paramCount++;
    }

    if (locked_spot_price !== undefined) {
      updates.push(`locked_spot_price = $${paramCount}`);
      values.push(locked_spot_price || null);
      paramCount++;
    }

    if (payment_advance !== undefined) {
      updates.push(`payment_advance = $${paramCount}`);
      values.push(payment_advance || null);
      paramCount++;
    }

    if (final_weight !== undefined) {
      updates.push(`final_weight = $${paramCount}`);
      values.push(final_weight || null);
      paramCount++;
    }

    if (assay !== undefined) {
      updates.push(`assay = $${paramCount}`);
      values.push(assay || null);
      paramCount++;
    }

    if (total_settlement_amount !== undefined) {
      updates.push(`total_settlement_amount = $${paramCount}`);
      values.push(total_settlement_amount || null);
      paramCount++;
    }

    if (final_payment_amount !== undefined) {
      updates.push(`final_payment_amount = $${paramCount}`);
      values.push(final_payment_amount || null);
      paramCount++;
    }

    if (updated_by !== undefined) {
      updates.push(`updated_by = $${paramCount}`);
      values.push(updated_by || null);
      paramCount++;
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const updateQuery = `
      UPDATE scrap
      SET ${updates.join(', ')}
      WHERE bucket_id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    await client.query('COMMIT');
    res.json(result.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');

    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'A bucket with this name already exists' });
    }

    console.error('Error updating scrap bucket:', err);
    res.status(500).json({ error: 'Failed to update scrap bucket' });
  } finally {
    client.release();
  }
});

// DELETE a scrap bucket
app.delete('/api/scrap/buckets/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Check if bucket exists
    const checkQuery = 'SELECT * FROM scrap WHERE bucket_id = $1';
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Scrap bucket not found' });
    }

    const bucket = checkResult.rows[0];

    // Check if bucket has items
    if (bucket.item_id && bucket.item_id.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot delete bucket with items. Please remove all items first.' });
    }

    // Delete the bucket
    const deleteQuery = 'DELETE FROM scrap WHERE bucket_id = $1 RETURNING *';
    const result = await client.query(deleteQuery, [id]);

    await client.query('COMMIT');
    res.json({ message: 'Bucket deleted successfully', bucket: result.rows[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting scrap bucket:', err);
    res.status(500).json({ error: 'Failed to delete scrap bucket' });
  } finally {
    client.release();
  }
});

// Upload weight photo for scrap bucket
app.post('/api/scrap/buckets/:id/weight-photo', uploadScrapPhoto, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }

    // Store image as binary data (BYTEA) in database
    const imageBuffer = req.file.buffer;

    // Update database with weight photo binary data
    const updateQuery = `
      UPDATE scrap
      SET weight_photo = $1, updated_at = CURRENT_TIMESTAMP
      WHERE bucket_id = $2
      RETURNING bucket_id, bucket_name, status, created_at, updated_at, notes
    `;
    const result = await pool.query(updateQuery, [imageBuffer, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scrap bucket not found' });
    }

    res.json({
      message: 'Weight photo uploaded successfully',
      bucket: result.rows[0]
    });

  } catch (err) {
    console.error('Error uploading weight photo:', err);
    res.status(500).json({ error: 'Failed to upload weight photo' });
  }
});

// Get weight photo for scrap bucket
app.get('/api/scrap/buckets/:id/weight-photo', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT weight_photo FROM scrap WHERE bucket_id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0 || !result.rows[0].weight_photo) {
      return res.status(404).json({ error: 'Weight photo not found' });
    }

    const imageBuffer = result.rows[0].weight_photo;

    // Set appropriate content type
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', imageBuffer.length);
    res.send(imageBuffer);

  } catch (err) {
    console.error('Error retrieving weight photo:', err);
    res.status(500).json({ error: 'Failed to retrieve weight photo' });
  }
});

// GET endpoint to fetch scrap bucket history
app.get('/api/scrap/buckets/:id/history', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        h.history_id,
        h.bucket_id,
        h.action_type,
        h.action_date,
        h.performed_by,
        h.old_value,
        h.new_value,
        h.notes,
        e.first_name,
        e.last_name,
        e.username
      FROM scrap_bucket_history h
      LEFT JOIN employees e ON h.performed_by = e.employee_id
      WHERE h.bucket_id = $1
      ORDER BY h.action_date ASC
    `;

    const result = await pool.query(query, [id]);
    res.json(result.rows);

  } catch (err) {
    console.error('Error retrieving bucket history:', err);
    res.status(500).json({ error: 'Failed to retrieve bucket history' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!', details: err.message });
});

// POST endpoint to log changes to item history
app.post('/api/jewelry/history', async (req, res) => {
  const client = await pool.connect();
  try {
    const { item_id, changed_by, action, changed_fields, notes } = req.body;
    if (!item_id || !changed_by || !action || !changed_fields) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get the next version number
    const versionResult = await client.query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM jewelry_item_history WHERE item_id = $1',
      [item_id]
    );
    const version_number = versionResult.rows[0].next_version;
    
    const query = `
      INSERT INTO jewelry_item_history (
        item_id, 
        version_number,
        changed_by, 
        action_type, 
        changed_fields, 
        change_notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await client.query(query, [
      item_id,
      version_number,
      changed_by,
      action,
      JSON.stringify(changed_fields),
      notes || 'Item details updated'
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error logging history:', error);
    res.status(500).json({ error: 'Failed to log history' });
  } finally {
    client.release();
  }
});

// GET endpoint to retrieve item history by item_id
app.get('/api/jewelry/:item_id/history', async (req, res) => {
  try {
    const { item_id } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) FROM jewelry_item_history WHERE item_id = $1';
    const countResult = await pool.query(countQuery, [item_id]);
    
    // Get paginated history
    const historyQuery = `
      SELECT h.*, e.first_name, e.last_name
      FROM jewelry_item_history h
      LEFT JOIN employees e ON h.changed_by = e.employee_id
      WHERE h.item_id = $1
      ORDER BY h.changed_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const historyResult = await pool.query(historyQuery, [item_id, limit, offset]);
    
    res.json({
      total: parseInt(countResult.rows[0].count, 10),
      history: historyResult.rows
    });
  } catch (error) {
    console.error('Error fetching item history:', error);
    res.status(500).json({ error: 'Failed to fetch item history' });
  }
});

// PUT endpoint to update change notes for a specific history entry
app.put('/api/jewelry/history/:history_id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { history_id } = req.params;
    const { change_notes } = req.body;
    
    if (!change_notes) {
      return res.status(400).json({ error: 'Change notes are required' });
    }
    
    const query = `
      UPDATE jewelry_item_history 
      SET change_notes = $1 
      WHERE history_id = $2
      RETURNING *
    `;
    
    const result = await client.query(query, [change_notes, history_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'History entry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating history entry:', error);
    res.status(500).json({ error: 'Failed to update history entry' });
  } finally {
    client.release();
  }
});

// Business Info Endpoints
// GET business info
app.get('/api/business-info', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM business_info ORDER BY id LIMIT 1');
    if (result.rows.length === 0) {
      // Return default values if no record exists
      return res.json({
        id: null,
        business_name: 'Evergreen POS',
        email: '',
        phone: '',
        address: '',
        currency: 'USD',
        timezone: 'UTC',
        logo: null,
        logo_filename: null,
        logo_mimetype: null
      });
    }

    // Convert logo bytea to base64 if it exists
    const businessInfo = result.rows[0];
    if (businessInfo.logo) {
      businessInfo.logo = businessInfo.logo.toString('base64');
    }

    res.json(businessInfo);
  } catch (error) {
    console.error('Error fetching business info:', error);
    res.status(500).json({ error: 'Failed to fetch business info' });
  }
});

// UPDATE business info
app.put('/api/business-info', upload.single('logo'), async (req, res) => {
  const { business_name, email, phone, address, currency, timezone } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if a record exists
    const checkResult = await client.query('SELECT id FROM business_info LIMIT 1');

    let query;
    let values;

    if (req.file) {
      // Update with logo
      const logoBuffer = req.file.buffer;
      const logoFilename = req.file.originalname;
      const logoMimetype = req.file.mimetype;

      if (checkResult.rows.length === 0) {
        // Insert new record
        query = `
          INSERT INTO business_info
          (business_name, email, phone, address, currency, timezone, logo, logo_filename, logo_mimetype)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;
        values = [business_name, email, phone, address, currency, timezone, logoBuffer, logoFilename, logoMimetype];
      } else {
        // Update existing record
        query = `
          UPDATE business_info
          SET business_name = $1, email = $2, phone = $3, address = $4,
              currency = $5, timezone = $6, logo = $7, logo_filename = $8, logo_mimetype = $9
          WHERE id = $10
          RETURNING *
        `;
        values = [business_name, email, phone, address, currency, timezone, logoBuffer, logoFilename, logoMimetype, checkResult.rows[0].id];
      }
    } else {
      // Update without logo
      if (checkResult.rows.length === 0) {
        // Insert new record
        query = `
          INSERT INTO business_info
          (business_name, email, phone, address, currency, timezone)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        values = [business_name, email, phone, address, currency, timezone];
      } else {
        // Update existing record
        query = `
          UPDATE business_info
          SET business_name = $1, email = $2, phone = $3, address = $4,
              currency = $5, timezone = $6
          WHERE id = $7
          RETURNING *
        `;
        values = [business_name, email, phone, address, currency, timezone, checkResult.rows[0].id];
      }
    }

    const result = await client.query(query, values);
    await client.query('COMMIT');

    // Convert logo bytea to base64 if it exists
    const businessInfo = result.rows[0];
    if (businessInfo.logo) {
      businessInfo.logo = businessInfo.logo.toString('base64');
    }

    res.json(businessInfo);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating business info:', error);
    res.status(500).json({ error: 'Failed to update business info' });
  } finally {
    client.release();
  }
});

// DELETE business logo
app.delete('/api/business-info/logo', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE business_info SET logo = NULL, logo_filename = NULL, logo_mimetype = NULL WHERE id = (SELECT id FROM business_info LIMIT 1) RETURNING *'
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business info not found' });
    }

    res.json({ message: 'Logo deleted successfully' });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ error: 'Failed to delete logo' });
  }
});

// ==================== LAYAWAY ENDPOINTS ====================

// GET layaways by view
app.get('/api/layaways', async (req, res) => {
  try {
    const { view } = req.query;
    let query;

    // Note: All layaway views include customer_name via JOIN with customers table
    switch (view) {
      case 'overdue':
        query = 'SELECT * FROM layaway_overdue';
        break;
      case 'past-due':
        query = 'SELECT * FROM layaway_past_due';
        break;
      case 'active':
        query = 'SELECT * FROM layaway_active';
        break;
      case 'no-activity':
        query = 'SELECT * FROM layaway_no_activity';
        break;
      case 'no-payment':
        query = 'SELECT * FROM layaway_no_payment_30_days';
        break;
      case 'locate':
        query = 'SELECT * FROM layaway_locate';
        break;
      case 'reporting':
        query = `
          SELECT
            l.*,
            CONCAT(c.first_name, ' ', c.last_name) AS customer_name
          FROM layaway l
          LEFT JOIN customers c ON l.customer_id = c.id
        `;
        break;
      default:
        query = 'SELECT * FROM layaway_overdue';
    }

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching layaways:', err);
    res.status(500).json({ error: 'Failed to fetch layaways' });
  }
});

// GET single layaway by ID
app.get('/api/layaways/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM layaway WHERE layaway_id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layaway not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching layaway:', err);
    res.status(500).json({ error: 'Failed to fetch layaway' });
  }
});

// POST create new layaway
app.post('/api/layaways', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customer_id,
      item_id,
      employee_id,
      total_price,
      down_payment,
      payment_frequency,
      payment_amount,
      next_payment_date,
      notes,
      terms
    } = req.body;

    // Validate required fields
    if (!customer_id || !item_id || !total_price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await client.query('BEGIN');

    const amount_paid = parseFloat(down_payment) || 0;
    const balance_remaining = parseFloat(total_price) - amount_paid;

    // Create layaway
    const insertQuery = `
      INSERT INTO layaway (
        customer_id, item_id, employee_id, total_price, down_payment,
        amount_paid, balance_remaining, payment_frequency, payment_amount,
        next_payment_date, notes, terms, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      customer_id,
      item_id,
      employee_id,
      total_price,
      down_payment || 0,
      amount_paid,
      balance_remaining,
      payment_frequency || 'WEEKLY',
      payment_amount,
      next_payment_date,
      notes,
      terms,
      'ACTIVE'
    ]);

    const layaway_id = result.rows[0].layaway_id;

    // Record down payment if provided
    if (amount_paid > 0) {
      await client.query(
        `INSERT INTO layaway_payments (layaway_id, amount, payment_method, notes, received_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [layaway_id, amount_paid, 'DOWN_PAYMENT', 'Initial down payment', employee_id]
      );

      await client.query(
        'UPDATE layaway SET last_payment_date = CURRENT_TIMESTAMP WHERE layaway_id = $1',
        [layaway_id]
      );
    }

    // Create history record
    await client.query(
      `INSERT INTO layaway_history (layaway_id, action_type, performed_by, notes)
       VALUES ($1, $2, $3, $4)`,
      [layaway_id, 'CREATED', employee_id, 'Layaway created']
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating layaway:', err);
    res.status(500).json({ error: 'Failed to create layaway' });
  } finally {
    client.release();
  }
});

// POST make payment on layaway
app.post('/api/layaways/:id/payment', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { amount, payment_method, notes, received_by } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    await client.query('BEGIN');

    // Get current layaway
    const layawayResult = await client.query(
      'SELECT * FROM layaway WHERE layaway_id = $1',
      [id]
    );

    if (layawayResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Layaway not found' });
    }

    const layaway = layawayResult.rows[0];
    const newAmountPaid = parseFloat(layaway.amount_paid) + parseFloat(amount);
    const newBalance = parseFloat(layaway.total_price) - newAmountPaid;

    // Record payment
    await client.query(
      `INSERT INTO layaway_payments (layaway_id, amount, payment_method, notes, received_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, amount, payment_method || 'CASH', notes, received_by]
    );

    // Update layaway
    const updateQuery = `
      UPDATE layaway
      SET amount_paid = $1,
          balance_remaining = $2,
          last_payment_date = CURRENT_TIMESTAMP,
          status = CASE
            WHEN $2 <= 0 THEN 'COMPLETED'
            ELSE status
          END,
          completion_date = CASE
            WHEN $2 <= 0 THEN CURRENT_TIMESTAMP
            ELSE completion_date
          END
      WHERE layaway_id = $3
      RETURNING *
    `;

    const result = await client.query(updateQuery, [newAmountPaid, newBalance, id]);

    // Create history record
    await client.query(
      `INSERT INTO layaway_history (layaway_id, action_type, performed_by, old_value, new_value, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, 'PAYMENT_MADE', received_by, layaway.amount_paid, newAmountPaid, `Payment of $${amount}`]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', err);
    res.status(500).json({ error: 'Failed to process payment' });
  } finally {
    client.release();
  }
});

// POST update contact date
app.post('/api/layaways/:id/contact', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { performed_by } = req.body;

    await client.query('BEGIN');

    // Update last contact date
    const result = await client.query(
      'UPDATE layaway SET last_contact_date = CURRENT_DATE WHERE layaway_id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Layaway not found' });
    }

    // Create history record
    await client.query(
      `INSERT INTO layaway_history (layaway_id, action_type, performed_by, notes)
       VALUES ($1, $2, $3, $4)`,
      [id, 'CONTACTED', performed_by, 'Customer contacted']
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating contact:', err);
    res.status(500).json({ error: 'Failed to update contact' });
  } finally {
    client.release();
  }
});

// PUT update layaway
app.put('/api/layaways/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, notes, payment_frequency, payment_amount, next_payment_date } = req.body;

    await client.query('BEGIN');

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (status) {
      updateFields.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }
    if (payment_frequency) {
      updateFields.push(`payment_frequency = $${paramCount}`);
      values.push(payment_frequency);
      paramCount++;
    }
    if (payment_amount) {
      updateFields.push(`payment_amount = $${paramCount}`);
      values.push(payment_amount);
      paramCount++;
    }
    if (next_payment_date) {
      updateFields.push(`next_payment_date = $${paramCount}`);
      values.push(next_payment_date);
      paramCount++;
    }

    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE layaway SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE layaway_id = $${paramCount} RETURNING *`;

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Layaway not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating layaway:', err);
    res.status(500).json({ error: 'Failed to update layaway' });
  } finally {
    client.release();
  }
});

// GET layaway history
app.get('/api/layaways/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM layaway_history WHERE layaway_id = $1 ORDER BY action_date DESC';
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching layaway history:', err);
    res.status(500).json({ error: 'Failed to fetch layaway history' });
  }
});

// GET layaway payments
app.get('/api/layaways/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM layaway_payments WHERE layaway_id = $1 ORDER BY payment_date DESC';
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching layaway payments:', err);
    res.status(500).json({ error: 'Failed to fetch layaway payments' });
  }
});

// ============================================
// ITEM ATTRIBUTES ENDPOINTS
// ============================================

// Get all attribute configurations
app.get('/api/attribute-config', async (req, res) => {
  try {
    const { inventory_type } = req.query;
    let query = 'SELECT * FROM attribute_config';
    let params = [];

    if (inventory_type) {
      query += ' WHERE inventory_type = $1 OR inventory_type IS NULL';
      params = [inventory_type];
    }

    query += ' ORDER BY attribute_name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching attribute config:', err);
    res.status(500).json({ error: 'Failed to fetch attribute configuration' });
  }
});

// Save/Update attribute configuration
app.post('/api/attribute-config', async (req, res) => {
  try {
    const { attribute_name, attribute_type, attribute_options, inventory_type } = req.body;

    const query = `
      INSERT INTO attribute_config (attribute_name, attribute_type, attribute_options, inventory_type, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (attribute_name)
      DO UPDATE SET
        attribute_type = $2,
        attribute_options = $3,
        inventory_type = $4,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [attribute_name, attribute_type || 'dropdown', attribute_options, inventory_type]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error saving attribute config:', err);
    res.status(500).json({ error: 'Failed to save attribute configuration' });
  }
});

// Delete attribute configuration
app.delete('/api/attribute-config/:attribute_name', async (req, res) => {
  try {
    const { attribute_name } = req.params;
    await pool.query('DELETE FROM attribute_config WHERE attribute_name = $1', [attribute_name]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting attribute config:', err);
    res.status(500).json({ error: 'Failed to delete attribute configuration' });
  }
});

// Get item attributes for a specific item
app.get('/api/item-attributes/:item_id', async (req, res) => {
  try {
    const { item_id } = req.params;
    const query = 'SELECT * FROM item_attributes WHERE item_id = $1';
    const result = await pool.query(query, [item_id]);

    // Convert to object format { attribute_name: attribute_value }
    const attributes = {};
    result.rows.forEach(row => {
      attributes[row.attribute_name] = row.attribute_value;
    });

    res.json(attributes);
  } catch (err) {
    console.error('Error fetching item attributes:', err);
    res.status(500).json({ error: 'Failed to fetch item attributes' });
  }
});

// Save/Update item attributes
app.post('/api/item-attributes/:item_id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { item_id } = req.params;
    const attributes = req.body; // { attribute_name: value, ... }

    // Delete existing attributes for this item
    await client.query('DELETE FROM item_attributes WHERE item_id = $1', [item_id]);

    // Insert new attributes
    for (const [attribute_name, attribute_value] of Object.entries(attributes)) {
      if (attribute_value) { // Only save if value is not empty
        await client.query(
          `INSERT INTO item_attributes (item_id, attribute_name, attribute_value)
           VALUES ($1, $2, $3)`,
          [item_id, attribute_name, attribute_value]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving item attributes:', err);
    res.status(500).json({ error: 'Failed to save item attributes' });
  } finally {
    client.release();
  }
});

// Delete specific attribute for an item
app.delete('/api/item-attributes/:item_id/:attribute_name', async (req, res) => {
  try {
    const { item_id, attribute_name } = req.params;
    await pool.query(
      'DELETE FROM item_attributes WHERE item_id = $1 AND attribute_name = $2',
      [item_id, attribute_name]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting item attribute:', err);
    res.status(500).json({ error: 'Failed to delete item attribute' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database migration endpoint (protected)
app.post('/api/migrate', async (req, res) => {
  try {
    // Simple authentication - require a migration key
    const migrationKey = req.header('X-Migration-Key');

    if (migrationKey !== process.env.MIGRATION_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    console.log('Running database migrations...');
    const { runMigrations } = require('./migrate');

    const results = await runMigrations();

    res.json({
      success: true,
      message: 'Migrations completed successfully',
      results
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
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

// Create payment endpoint
app.post('/api/payments', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { transaction_id, amount, payment_method } = req.body;
    console.log(req.body);
    
    // Validate payment method
    if (!['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CHECK'].includes(payment_method)) {
      throw new Error('Invalid payment method');
    }
    
    // Get transaction and validate amount
    const transactionResult = await client.query(
      'SELECT * FROM transactions WHERE transaction_id = $1 FOR UPDATE',
      [transaction_id]
    );
    
    if (transactionResult.rows.length === 0) {
      throw new Error('Transaction not found');
    }
    
    const transaction = transactionResult.rows[0];
    
    // Get total payments made so far
    const paymentsResult = await client.query(
      'SELECT COALESCE(SUM(amount), 0) as paid_amount FROM payments WHERE transaction_id = $1',
      [transaction_id]
    );
    
    const paidAmount = parseFloat(paymentsResult.rows[0].paid_amount);
    const newTotalPaid = paidAmount + parseFloat(amount);

    // Use epsilon tolerance to handle floating-point precision errors
    const EPSILON = 0.01; // 1 cent tolerance
    if (newTotalPaid > transaction.total_amount + EPSILON) {
      throw new Error('Payment amount exceeds remaining balance');
    }
    
    // Create payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (
        transaction_id, amount, payment_method
      ) VALUES ($1, $2, $3) RETURNING *`,
      [transaction_id, amount, payment_method]
    );

    await client.query('COMMIT');
    res.status(201).json(paymentResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', error);
    res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});
