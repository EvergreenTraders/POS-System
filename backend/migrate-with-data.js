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

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

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
  } : false,
  // Increase timeouts for large imports
  connectionTimeoutMillis: 60000,
  idleTimeoutMillis: 60000,
  statement_timeout: 120000,
  query_timeout: 120000
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
        'user_preferences',
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

      const tableResults = []; // Track results for each table

      for (const tableName of importOrder) {
        // Find table in export by name
        const tableExport = dataExport.tables.find(t => t.table === tableName);

        if (!tableExport || !tableExport.rows || tableExport.rows.length === 0) {
          console.log(`  ⊘ ${tableName}: No data to import`);
          tableResults.push({ table: tableName, status: 'skipped', reason: 'no data' });
          skippedCount++;
          continue;
        }

        const tableData = tableExport.rows;

        console.log(`  Importing ${tableName} (${tableData.length} rows)...`);

        // Get column names from first row, excluding generated columns for specific tables
        const allColumns = Object.keys(tableData[0]);
        // cash_denominations has a generated 'total_amount' column, jewelry has 'total_weight'
        const generatedColumnsMap = {
          'cash_denominations': ['total_amount'],
          'jewelry': ['total_weight']
        };
        const generatedColumns = generatedColumnsMap[tableName] || [];
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

        // Insert data in batches to avoid connection timeouts
        let successCount = 0;
        let errorCount = 0;
        let firstError = null;
        const BATCH_SIZE = 25; // Insert 25 rows at a time for better reliability

        // Columns that are JSON/JSONB type (not PostgreSQL arrays)
        const jsonColumns = ['images', 'changed_fields', 'old_value', 'new_value', 'metadata'];
        // Columns that are PostgreSQL array type
        const pgArrayColumns = ['attribute_options'];

        for (let i = 0; i < tableData.length; i += BATCH_SIZE) {
          const batch = tableData.slice(i, i + BATCH_SIZE);

          // Show progress for large tables
          if (tableData.length > 100 && i % 100 === 0) {
            console.log(`    Progress: ${i}/${tableData.length} rows...`);
            // Keep connection alive for large tables
            try {
              await client.query('SELECT 1');
            } catch (e) {
              console.log(`    ⚠ Keepalive failed: ${e.message}`);
            }
          }

          for (const row of batch) {
          // Handle special column types (JSON, JSONB, arrays)
          const values = columns.map(col => {
            const value = row[col];
            // Handle JSON/JSONB columns - convert to JSON string
            if (jsonColumns.includes(col) && value !== null) {
              return JSON.stringify(value);
            }
            // Handle PostgreSQL array columns
            if (pgArrayColumns.includes(col) && Array.isArray(value)) {
              return `{${value.map(v => `"${v}"`).join(',')}}`;
            }
            // Convert other objects to JSON strings
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
              return JSON.stringify(value);
            }
            // Convert other arrays to PostgreSQL array format
            if (Array.isArray(value)) {
              return `{${value.map(v => `"${v}"`).join(',')}}`;
            }
            return value;
          });
          const query = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;

          try {
            await client.query(query, values);
            successCount++;
          } catch (error) {
            errorCount++;
            if (!firstError) {
              firstError = error.message;
            }
            // Log first 5 errors for debugging
            if (errorCount <= 5) {
              console.log(`    ⚠ Row ${errorCount} failed for ${tableName}: ${error.message}`);
              if (errorCount === 1) {
                console.log(`    Columns: ${columns.join(', ')}`);
                console.log(`    Query: ${query.substring(0, 200)}...`);
                console.log(`    First value: ${JSON.stringify(values[0])}`);
              }
            }
            // For critical tables, continue anyway
            if (tableName === 'jewelry' || tableName === 'transactions') {
              // Don't break the entire import for data issues
              continue;
            }
          }
        }

        // Keep connection alive after each batch
        if ((i + BATCH_SIZE) < tableData.length) {
          try {
            await client.query('SELECT 1');
          } catch (e) {
            console.log(`    ⚠ Keepalive query failed: ${e.message}`);
          }
        }
      }

        tableResults.push({
          table: tableName,
          total: tableData.length,
          inserted: successCount,
          errors: errorCount,
          firstError: firstError
        });

        if (errorCount > 0) {
          console.log(`  ✓ ${tableName}: ${successCount} rows inserted, ${errorCount} errors`);
        } else {
          console.log(`  ✓ ${tableName}: ${successCount} rows inserted`);
        }

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
        tableDetails: tableResults.filter(t => t.errors > 0 || t.status === 'skipped'),
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
