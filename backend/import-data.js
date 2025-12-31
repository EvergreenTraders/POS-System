const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// AWS RDS database configuration
const awsPool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function clearTable(tableName) {
  try {
    console.log(`  Clearing ${tableName}...`);
    await awsPool.query(`TRUNCATE TABLE ${tableName} CASCADE`);
    console.log(`  ✓ Cleared ${tableName}`);
  } catch (error) {
    console.error(`  ✗ Error clearing ${tableName}:`, error.message);
    throw error;
  }
}

async function importTableData(tableData) {
  const { table, rows } = tableData;

  if (!rows || rows.length === 0) {
    console.log(`  ⚠ No data to import for ${table}`);
    return;
  }

  try {
    console.log(`Importing ${rows.length} rows into ${table}...`);

    // Get column names from first row
    const columns = Object.keys(rows[0]);

    // Process rows to convert base64 strings back to Buffers if needed
    const processedRows = rows.map(row => {
      const newRow = { ...row };

      Object.keys(newRow).forEach(key => {
        const value = newRow[key];

        // Check if this looks like a base64-encoded buffer
        // (very long string that's valid base64)
        if (typeof value === 'string' && value.length > 100 && /^[A-Za-z0-9+/]+=*$/.test(value.substring(0, 100))) {
          try {
            newRow[key] = Buffer.from(value, 'base64');
          } catch (e) {
            // If it's not valid base64, leave it as string
          }
        }
      });

      return newRow;
    });

    // Build parameterized query
    const placeholders = processedRows.map((_, rowIndex) => {
      const rowPlaceholders = columns.map((_, colIndex) => {
        return `$${rowIndex * columns.length + colIndex + 1}`;
      }).join(', ');
      return `(${rowPlaceholders})`;
    }).join(', ');

    const columnNames = columns.map(col => `"${col}"`).join(', ');
    const query = `INSERT INTO ${table} (${columnNames}) VALUES ${placeholders}`;

    // Flatten all values
    const values = processedRows.flatMap(row => columns.map(col => row[col]));

    await awsPool.query(query, values);

    console.log(`  ✓ Imported ${rows.length} rows into ${table}`);

    // Reset sequence if table has an id column
    if (columns.includes('id')) {
      try {
        await awsPool.query(`
          SELECT setval(pg_get_serial_sequence('${table}', 'id'),
                        COALESCE((SELECT MAX(id) FROM ${table}), 1),
                        true)
        `);
        console.log(`  ✓ Reset sequence for ${table}.id`);
      } catch (seqError) {
        // Some tables might not have sequences, ignore error
      }
    }

    // Reset sequence for employee_id if it exists
    if (columns.includes('employee_id') && table === 'employees') {
      try {
        await awsPool.query(`
          SELECT setval(pg_get_serial_sequence('employees', 'employee_id'),
                        COALESCE((SELECT MAX(employee_id) FROM employees), 1),
                        true)
        `);
        console.log(`  ✓ Reset sequence for employees.employee_id`);
      } catch (seqError) {
        // Ignore if sequence doesn't exist
      }
    }

  } catch (error) {
    console.error(`  ✗ Error importing ${table}:`, error.message);
    throw error;
  }
}

async function importAllData(exportFilePath) {
  console.log('Starting data import to AWS RDS...\n');

  // Read export file
  if (!fs.existsSync(exportFilePath)) {
    throw new Error(`Export file not found: ${exportFilePath}`);
  }

  const exportData = JSON.parse(fs.readFileSync(exportFilePath, 'utf8'));

  console.log(`Import file: ${exportFilePath}`);
  console.log(`Export date: ${exportData.exportDate}`);
  console.log(`Tables to import: ${exportData.tables.length}\n`);

  // Clear all tables first (in reverse order to respect foreign keys)
  console.log('Clearing existing data...\n');
  for (let i = exportData.tables.length - 1; i >= 0; i--) {
    await clearTable(exportData.tables[i].table);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Importing data...');
  console.log('='.repeat(60) + '\n');

  // Import tables in order
  let successCount = 0;
  let totalRows = 0;

  for (const tableData of exportData.tables) {
    try {
      await importTableData(tableData);
      successCount++;
      totalRows += tableData.rowCount;
    } catch (error) {
      console.error(`\n✗ Failed to import ${tableData.table}:`, error.message);
      throw error;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Import Summary:');
  console.log('='.repeat(60));
  console.log(`Successfully imported: ${successCount}/${exportData.tables.length} tables`);
  console.log(`Total rows imported: ${totalRows}`);
  console.log('='.repeat(60));
}

// Run import
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node import-data.js <export-file-path>');
    console.error('Example: node import-data.js data-exports/database-export-2024-01-15.json');
    process.exit(1);
  }

  const exportFilePath = args[0];

  importAllData(exportFilePath)
    .then(() => {
      console.log('\n✓ Data import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Import failed:', error.message);
      process.exit(1);
    })
    .finally(() => {
      awsPool.end();
    });
}

module.exports = { importAllData };
