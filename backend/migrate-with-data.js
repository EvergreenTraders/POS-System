require('dotenv').config();
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
  'add_performance_indexes.sql',
  'customer_headers_preferences.sql',
  'pawn.sql'
];

async function runMigrations() {
  console.log('=== STEP 1: Running Database Schema Migrations ===\n');

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

  console.log('\n✓ Database schema migrations completed!\n');
  return results;
}

async function importData() {
  console.log('=== STEP 2: Importing Data ===\n');

  // Check if data export file exists
  const dataExportPath = path.join(__dirname, 'data-export.json');

  if (!fs.existsSync(dataExportPath)) {
    console.log('⚠ No data-export.json file found, skipping data import');
    console.log('  To include data in migrations, create backend/data-export.json');
    return { skipped: true, message: 'No data export file found' };
  }

  try {
    console.log('Reading data export file...');
    const dataExport = JSON.parse(fs.readFileSync(dataExportPath, 'utf8'));

    console.log(`Found export from: ${dataExport.exportDate}`);
    console.log(`Database: ${dataExport.database}\n`);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Import tables in dependency order
      const importOrder = [
        'employees',
        'customers',
        'business_info',
        'system_config',
        'pawn_config',
        'tax_config',
        'cases_config',
        'cash_drawer_sessions',
        'storage_location',
        'jewelry',
        'jewelry_secondary_gems',
        'transactions',
        'transaction_items',
        'payments',
        'pawn_ticket',
        'buy_ticket',
        'sale_ticket',
        'layaway',
        'scrap_buckets',
        'scrap_items',
        'quotes',
        'quote_items',
        'jewelry_item_history'
      ];

      let importedCount = 0;
      let skippedCount = 0;

      for (const tableName of importOrder) {
        const tableData = dataExport.tables[tableName];

        if (!tableData || tableData.length === 0) {
          console.log(`  ⊘ ${tableName}: No data to import`);
          skippedCount++;
          continue;
        }

        console.log(`  Importing ${tableName} (${tableData.length} rows)...`);

        // Get column names from first row
        const columns = Object.keys(tableData[0]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const columnNames = columns.join(', ');

        // Clear existing data (optional - comment out if you want to preserve existing data)
        // await client.query(`TRUNCATE TABLE ${tableName} CASCADE`);

        // Insert data
        for (const row of tableData) {
          const values = columns.map(col => row[col]);
          const query = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

          try {
            await client.query(query, values);
          } catch (error) {
            console.log(`    ⚠ Warning: Could not insert row into ${tableName}: ${error.message}`);
          }
        }

        console.log(`  ✓ ${tableName} imported successfully`);
        importedCount++;
      }

      await client.query('COMMIT');

      console.log(`\n✓ Data import completed!`);
      console.log(`  Imported: ${importedCount} tables`);
      console.log(`  Skipped: ${skippedCount} tables (no data)\n`);

      return {
        success: true,
        imported: importedCount,
        skipped: skippedCount
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('✗ Data import failed:', error.message);
    throw new Error(`Data import failed: ${error.message}`);
  }
}

async function runMigrationsWithData() {
  console.log('Starting database migrations with data import...\n');

  try {
    // Step 1: Run schema migrations
    const migrationResults = await runMigrations();

    // Step 2: Import data
    const importResults = await importData();

    console.log('=== MIGRATION COMPLETE ===\n');
    console.log('All migrations and data import completed successfully!');

    return {
      migrations: migrationResults,
      dataImport: importResults
    };

  } catch (error) {
    console.error('\n✗ Migration with data failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// If run directly (not imported)
if (require.main === module) {
  runMigrationsWithData()
    .then((results) => {
      console.log('\nMigration Summary:');
      console.log(`  Schema migrations: ${results.migrations.length} files`);
      if (results.dataImport.skipped) {
        console.log(`  Data import: Skipped (no export file)`);
      } else {
        console.log(`  Data import: ${results.dataImport.imported} tables imported`);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nMigration failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runMigrationsWithData };
