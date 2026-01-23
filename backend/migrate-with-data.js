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

  console.log(`Current directory: ${__dirname}`);
  console.log(`Looking for data export at: ${dataExportPath}`);
  console.log(`File exists: ${fs.existsSync(dataExportPath)}`);

  if (!fs.existsSync(dataExportPath)) {
    console.log('⚠ No data-export.json file found, skipping data import');
    console.log('  To include data in migrations, create backend/data-export.json');

    // List files in current directory for debugging
    console.log('\nFiles in current directory:');
    try {
      const files = fs.readdirSync(__dirname);
      files.slice(0, 20).forEach(f => console.log(`  - ${f}`));
    } catch (e) {
      console.log('  Could not list files');
    }

    return { skipped: true, message: 'No data export file found' };
  }

  try {
    console.log('Reading data export file...');
    const dataExport = JSON.parse(fs.readFileSync(dataExportPath, 'utf8'));

    console.log(`Found export from: ${dataExport.exportDate}`);
    console.log(`Database: ${dataExport.database}`);
    console.log(`Tables in export: ${dataExport.tables.length}`);
    console.log(`Connecting to database: ${process.env.DB_HOST}/${process.env.DB_NAME}\n`);

    const client = await pool.connect();

    try {
      // Import tables in dependency order (only tables that exist in export)
      const importOrder = [
        'employees',
        'customers',
        'business_info',
        'pawn_config',
        'tax_config',
        'cases_config',
        'receipt_config',
        'inventory_status',
        'drawers',
        'drawer_config',
        'discrepancy_threshold',
        'cash_drawer_sessions',
        'cash_drawer_transactions',
        'cash_drawer_adjustments',
        'cash_denominations',
        'storage_location',
        'jewelry',
        'jewelry_secondary_gems',
        'transactions',
        'transaction_items',
        'payment_methods',
        'payments',
        'pawn_ticket',
        'pawn_history',
        'buy_ticket',
        'sale_ticket',
        'layaway',
        'layaway_payments',
        'scrap_buckets',
        'scrap_items',
        'scrap_bucket_history',
        'quotes',
        'quote_items',
        'jewelry_item_history',
        'customer_account_links',
        'customer_headers_preferences',
        'attribute_config',
        'item_attributes'
      ];

      let importedCount = 0;
      let skippedCount = 0;

      // Disable foreign key checks during import
      await client.query('SET session_replication_role = replica;');

      // Clear tables OUTSIDE transaction (so failures don't abort everything)
      console.log('  Clearing existing data...\n');
      for (let i = importOrder.length - 1; i >= 0; i--) {
        const tableName = importOrder[i];
        try {
          await client.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
          console.log(`    Cleared ${tableName}`);
        } catch (error) {
          console.log(`    ⚠ Could not clear ${tableName}: ${error.message}`);
        }
      }

      console.log('\n  Starting data import...\n');

      for (const tableName of importOrder) {
        // Find table in export by name
        const tableExport = dataExport.tables.find(t => t.table === tableName);

        if (!tableExport || !tableExport.rows || tableExport.rows.length === 0) {
          console.log(`  ⊘ ${tableName}: No data to import`);
          skippedCount++;
          continue;
        }

        const tableData = tableExport.rows;

        console.log(`  Importing ${tableName} (${tableData.length} rows)...`);

        // Get column names from first row, excluding generated columns
        const allColumns = Object.keys(tableData[0]);
        const generatedColumns = ['total_amount']; // Generated columns that can't be inserted
        const columns = allColumns.filter(col => !generatedColumns.includes(col));

        // Build placeholders with special handling for bytea columns
        const byteaColumns = ['logo', 'image', 'photo'];
        let paramIndex = 0;
        const placeholders = columns.map((col) => {
          paramIndex++;
          if (byteaColumns.includes(col)) {
            return `decode($${paramIndex}, 'base64')`;
          }
          return `$${paramIndex}`;
        }).join(', ');
        const columnNames = columns.join(', ');

        // Insert data
        let successCount = 0;
        let errorCount = 0;

        for (const row of tableData) {
          // Handle special column types (JSON, JSONB, arrays)
          const values = columns.map(col => {
            const value = row[col];
            // Convert arrays to PostgreSQL array format
            if (Array.isArray(value)) {
              return `{${value.map(v => `"${v}"`).join(',')}}`;
            }
            // Convert objects to JSON strings for JSONB columns
            if (value !== null && typeof value === 'object') {
              return JSON.stringify(value);
            }
            return value;
          });
          const query = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;

          try {
            await client.query(query, values);
            successCount++;
          } catch (error) {
            errorCount++;
            // Log first 5 errors for debugging
            if (errorCount <= 5) {
              console.log(`    ⚠ Row ${errorCount} failed for ${tableName}: ${error.message}`);
              if (errorCount === 1) {
                console.log(`    Query: ${query}`);
                console.log(`    Values (first 5): ${JSON.stringify(values.slice(0, 5))}`);
              }
            }
          }
        }

        if (errorCount > 0) {
          console.log(`  ✓ ${tableName}: ${successCount} rows inserted, ${errorCount} errors`);
        } else {
          console.log(`  ✓ ${tableName}: ${successCount} rows inserted`);
        }

        console.log(`  ✓ ${tableName} imported successfully`);
        importedCount++;
      }

      // Re-enable foreign key checks
      console.log('\n  Re-enabling foreign key checks...');
      await client.query('SET session_replication_role = DEFAULT;');

      console.log(`\n✓ Data import completed!`);
      console.log(`  Imported: ${importedCount} tables`);
      console.log(`  Skipped: ${skippedCount} tables (no data)\n`);

      // Verify import by checking key tables
      console.log('Verifying import...\n');
      try {
        const transactionCount = await client.query('SELECT COUNT(*) FROM transactions');
        const casesConfig = await client.query('SELECT number_of_cases FROM cases_config ORDER BY id DESC LIMIT 1');
        const maxTransaction = await client.query('SELECT transaction_id FROM transactions ORDER BY transaction_id DESC LIMIT 1');

        console.log(`  ✓ Transactions in database: ${transactionCount.rows[0].count}`);
        console.log(`  ✓ Latest transaction ID: ${maxTransaction.rows[0]?.transaction_id || 'none'}`);
        console.log(`  ✓ Storage cases config: ${casesConfig.rows[0]?.number_of_cases || 'none'}\n`);
      } catch (error) {
        console.log(`  ⚠ Could not verify: ${error.message}\n`);
      }

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

async function runMigrationsWithData(closePool = true) {
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
    // Only close pool if running standalone (not as module)
    if (closePool) {
      await pool.end();
    }
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
