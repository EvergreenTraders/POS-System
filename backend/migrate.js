const path = require('path');
const fs = require('fs');

// Load environment variables - use .env.aws if it exists, otherwise use .env
const envPath = path.join(__dirname, '.env.aws');
if (fs.existsSync(envPath)) {
  console.log('Loading AWS RDS configuration from .env.aws\n');
  require('dotenv').config({ path: envPath });
} else {
  console.log('Loading local configuration from .env\n');
  require('dotenv').config();
}

const { Pool } = require('pg');

// Database configuration from environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  // Only use SSL for production (AWS RDS)
  // AWS EB automatically sets NODE_ENV=production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Migration files in order
const MIGRATION_FILES = [
  // Core tables first (no dependencies)
  'business_info.sql',  // Creates currency_types
  'backup_settings.sql',
  'inter_store_transfers.sql',  // Creates stores table (needed by employees)
  'employees.sql',
  'employee_sessions.sql',
  'store_sessions.sql',
  'trusted_pcs.sql',
  'customers.sql',
  'inventory.sql',
  'metal_estimator.sql',  // Creates metal_style_category, metal_style_subcategory
  'gem_estimator.sql',
  'system_config.sql',
  'linked_account_authorization.sql',
  'create_customer_account_links.sql',
  'item_attributes.sql',
  'item_history.sql',
  'transactions.sql',
  'customer_ticket.sql',
  'layaway.sql',
  'scrap.sql',
  'scrap_history.sql',
  'quotes.sql',
  'tax_config.sql',
  'cash_drawer.sql',  // Creates adjustment_denominations, drawer_session_connections, banks, bank_deposits, petty_cash_accounts, petty_cash_payouts
  'petty_cash_expenses.sql',
  'add_performance_indexes.sql',
  'customer_headers_preferences.sql',
  'pawn.sql',
  'reset_sequences.sql'  // Must be last - resets all sequences after data migration
];

async function runMigrations() {
  console.log('Starting database migrations...');

  const results = [];

  for (const sqlFile of MIGRATION_FILES) {
    const filePath = path.join(__dirname, 'database', sqlFile);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠ ${sqlFile} not found, skipping`);
      results.push({ file: sqlFile, status: 'skipped', message: 'File not found' });
      continue;
    }

    try {
      console.log(`Running ${sqlFile}...`);
      const sql = fs.readFileSync(filePath, 'utf8');

      await pool.query(sql);

      console.log(`✓ ${sqlFile} completed successfully`);
      results.push({ file: sqlFile, status: 'success' });
    } catch (error) {
      console.error(`✗ ${sqlFile} failed:`, error.message);
      results.push({ file: sqlFile, status: 'error', message: error.message });

      // For some errors, we can continue (like table already exists, column already exists)
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate key') ||
          error.message.includes('does not exist') && error.message.includes('column')) {
        console.log(`  ⚠ Warning: ${error.message} - continuing...`);
        results.push({ file: sqlFile, status: 'warning', message: error.message });
        continue;
      }
      
      // Stop on first error
      throw new Error(`Migration failed at ${sqlFile}: ${error.message}`);
    }
  }

  console.log('Database migrations completed!');
  return results;
}

// If run directly (not imported)
if (require.main === module) {
  runMigrations()
    .then((results) => {
      console.log('\nMigration Summary:');
      results.forEach(r => {
        console.log(`  ${r.file}: ${r.status}`);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nMigration failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runMigrations };
