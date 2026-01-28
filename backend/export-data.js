const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load local environment variables
require('dotenv').config();

// Local database configuration
const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  port: process.env.DB_PORT || 5432,
  ssl: false
});

// Tables to export in dependency order
const TABLES = [
  'employees',
  'customers',
  'business_info',
  'system_config',
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
  'metal_estimator',
  'gem_estimator',
  'jewelry',
  'jewelry_secondary_gems',
  'transactions',
  'transaction_items',
  'transaction_types',
  'payment_methods',
  'payments',
  'pawn_ticket',
  'pawn_history',
  'buy_ticket',
  'sale_ticket',
  'layaway',
  'layaway_payments',
  'scrap',
  'scrap_bucket_history',
  'quotes',
  'quote_items',
  'jewelry_item_history',
  'linked_account_authorization',
  'customer_account_links',
  'customer_headers_preferences',
  'attribute_config',
  'item_attributes'
];

async function exportTableData(tableName) {
  try {
    console.log(`Exporting ${tableName}...`);

    // Get all data from table
    const result = await localPool.query(`SELECT * FROM ${tableName}`);

    if (result.rows.length === 0) {
      console.log(`  ⚠ ${tableName} has no data, skipping`);
      return null;
    }

    // For large tables, truncate very large text/bytea fields to prevent memory issues
    const processedRows = result.rows.map(row => {
      const newRow = { ...row };

      // Check each field
      Object.keys(newRow).forEach(key => {
        const value = newRow[key];

        // Handle Buffer objects (bytea fields)
        if (Buffer.isBuffer(value)) {
          // Convert buffer to base64 string
          newRow[key] = value.toString('base64');
        }
        // Handle very long strings (over 10MB)
        else if (typeof value === 'string' && value.length > 10 * 1024 * 1024) {
          console.log(`    Warning: Truncating large field ${key} in ${tableName}`);
          newRow[key] = value.substring(0, 10 * 1024 * 1024) + '...[TRUNCATED]';
        }
      });

      return newRow;
    });

    console.log(`  ✓ Exported ${result.rows.length} rows from ${tableName}`);
    return {
      table: tableName,
      rows: processedRows,
      rowCount: result.rows.length
    };
  } catch (error) {
    console.error(`  ✗ Error exporting ${tableName}:`, error.message);
    return null;
  }
}

async function exportAllData() {
  console.log('Starting data export from local database...\n');

  const exportData = {
    exportDate: new Date().toISOString(),
    tables: []
  };

  for (const tableName of TABLES) {
    const tableData = await exportTableData(tableName);
    if (tableData) {
      exportData.tables.push(tableData);
    }
  }

  // Save to JSON file
  const exportDir = path.join(__dirname, 'data-exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportFile = path.join(exportDir, `database-export-${timestamp}.json`);

  // Write file in chunks to handle large data
  try {
    const stream = fs.createWriteStream(exportFile);

    stream.write('{\n');
    stream.write(`  "exportDate": "${exportData.exportDate}",\n`);
    stream.write('  "tables": [\n');

    for (let i = 0; i < exportData.tables.length; i++) {
      const table = exportData.tables[i];
      const tableJson = JSON.stringify(table, null, 2)
        .split('\n')
        .map((line, index) => index === 0 ? `    ${line}` : `    ${line}`)
        .join('\n');

      stream.write(tableJson);

      if (i < exportData.tables.length - 1) {
        stream.write(',\n');
      } else {
        stream.write('\n');
      }
    }

    stream.write('  ]\n');
    stream.write('}\n');
    stream.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Failed to write export file: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Export Summary:');
  console.log('='.repeat(60));

  let totalRows = 0;
  exportData.tables.forEach(table => {
    console.log(`  ${table.table}: ${table.rowCount} rows`);
    totalRows += table.rowCount;
  });

  console.log('='.repeat(60));
  console.log(`Total: ${exportData.tables.length} tables, ${totalRows} rows`);
  console.log(`Export file: ${exportFile}`);
  console.log('='.repeat(60));

  // Also create a simple data-export.json for deployment
  const deploymentExportFile = path.join(__dirname, 'data-export.json');
  console.log(`\nCreating deployment export file: ${deploymentExportFile}`);

  try {
    // Copy the timestamped file to data-export.json for deployment
    fs.copyFileSync(exportFile, deploymentExportFile);
    console.log('✓ Deployment export file created successfully');
  } catch (error) {
    console.error('⚠ Warning: Could not create deployment export file:', error.message);
  }

  return exportFile;
}

// Run export
if (require.main === module) {
  exportAllData()
    .then((exportFile) => {
      console.log('\n✓ Data export completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Export failed:', error.message);
      process.exit(1);
    })
    .finally(() => {
      localPool.end();
    });
}

module.exports = { exportAllData };
