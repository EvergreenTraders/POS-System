const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
  'employees.sql',
  'customers.sql',
  'business_info.sql',
  'inventory.sql',
  'metal_estimator.sql',
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
  'cash_drawer.sql',
  'add_performance_indexes.sql'
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
