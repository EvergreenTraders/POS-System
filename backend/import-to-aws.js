/**
 * Import data to AWS RDS
 * This script loads AWS credentials from .env.aws and runs the import
 */

const fs = require('fs');
const path = require('path');

// Load AWS credentials from .env.aws
const awsEnvPath = path.join(__dirname, '.env.aws');

if (!fs.existsSync(awsEnvPath)) {
  console.error('\n✗ Error: .env.aws file not found!');
  console.error('\nPlease create backend/.env.aws with your AWS RDS credentials.');
  console.error('You can copy .env.aws.template and fill in the values.\n');
  process.exit(1);
}

// Load AWS environment variables
require('dotenv').config({ path: awsEnvPath });

// Verify required variables
const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('\n✗ Error: Missing required environment variables in .env.aws:');
  missing.forEach(key => console.error(`  - ${key}`));
  console.error('');
  process.exit(1);
}

console.log('AWS RDS Configuration:');
console.log(`  Host: ${process.env.DB_HOST}`);
console.log(`  User: ${process.env.DB_USER}`);
console.log(`  Database: ${process.env.DB_NAME}`);
console.log(`  Port: ${process.env.DB_PORT || 5432}`);
console.log('');

// Find the latest export file
const exportsDir = path.join(__dirname, 'data-exports');
if (!fs.existsSync(exportsDir)) {
  console.error('\n✗ Error: No data-exports directory found!');
  console.error('\nPlease run "npm run export-data" first to create a database export.\n');
  process.exit(1);
}

const exportFiles = fs.readdirSync(exportsDir)
  .filter(f => f.startsWith('database-export-') && f.endsWith('.json'))
  .map(f => ({
    name: f,
    path: path.join(exportsDir, f),
    time: fs.statSync(path.join(exportsDir, f)).mtime
  }))
  .sort((a, b) => b.time - a.time);

if (exportFiles.length === 0) {
  console.error('\n✗ Error: No export files found!');
  console.error('\nPlease run "npm run export-data" first to create a database export.\n');
  process.exit(1);
}

const latestExport = exportFiles[0];
console.log(`Using latest export: ${latestExport.name}`);
console.log(`Created: ${latestExport.time.toLocaleString()}\n`);

// Run the import
const { importAllData } = require('./import-data');

importAllData(latestExport.path)
  .then(() => {
    console.log('\n✓ Import to AWS RDS completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Import to AWS RDS failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  });
