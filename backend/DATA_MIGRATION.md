# Database Data Migration Guide

This guide explains how to export data from your local PostgreSQL database and import it to AWS RDS.

## Prerequisites

- Node.js installed
- Local PostgreSQL database running
- AWS RDS credentials configured in `.env` file

## Step 1: Export Data from Local Database

Run the export script to create a backup of all your local database data:

```bash
cd backend
node export-data.js
```

This will:
- Export all data from your local PostgreSQL database
- Create a JSON file in `backend/data-exports/` directory
- Show a summary of exported tables and row counts

Example output:
```
Exporting employees...
  ✓ Exported 3 rows from employees
Exporting customers...
  ✓ Exported 45 rows from customers
...
Export file: backend/data-exports/database-export-2024-01-15T10-30-45-123Z.json
```

## Step 2: Configure AWS RDS Credentials

Create a file named `.env.aws` in the `backend/` directory with your AWS RDS credentials:

```bash
cd backend
cp .env.aws .env.aws  # Edit this file
```

Fill in your AWS RDS connection details:

```
DB_HOST=your-rds-instance.xxxxx.ca-central-1.rds.amazonaws.com
DB_USER=postgres
DB_PASSWORD=your-rds-password
DB_NAME=postgres
DB_PORT=5432
NODE_ENV=production
```

You can find these credentials in:
- AWS RDS Console > Your Database Instance > Connectivity & security
- Elastic Beanstalk Environment > Configuration > Software > Environment properties

## Step 3: Import Data to AWS RDS

Run the import script to load the exported data into AWS RDS:

```bash
cd backend
npm run import-to-aws
```

This will:
- Automatically use the latest export file from Step 1
- Connect to AWS RDS using credentials from `.env.aws`
- Clear all existing data in AWS RDS (TRUNCATE CASCADE)
- Import all data from the export file
- Reset all database sequences (auto-increment IDs)
- Show a summary of imported tables and row counts

**⚠️ WARNING**: The import process will DELETE all existing data in AWS RDS before importing. Make sure you have a backup if needed.

### Manual Import (Advanced)

If you want to specify a specific export file:

```bash
cd backend
node import-data.js data-exports/database-export-2025-12-31T03-03-43-811Z.json
```

Make sure your `.env.aws` file is configured first.

## What Gets Migrated

All tables in dependency order:
- employees
- customers
- business_info
- inventory
- metal_estimator
- gem_estimator
- system_config
- linked_account_authorization
- customer_account_links
- item_attributes
- item_history
- transactions
- customer_ticket
- layaway
- scrap
- scrap_history
- quotes
- tax_config
- **drawers**
- **drawer_config**
- **discrepancy_threshold**
- **cash_drawer_sessions**

## Environment Variables Required

Make sure your `.env` file has the AWS RDS credentials:

```
DB_HOST=your-rds-instance.xxxxx.ca-central-1.rds.amazonaws.com
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=pos_system
DB_PORT=5432
NODE_ENV=production
```

## Troubleshooting

### Export fails with "database does not exist"
- Check that your local database name is `pos_system`
- Verify PostgreSQL is running locally

### Import fails with "connection refused"
- Check AWS RDS credentials in `.env` file
- Ensure your IP is whitelisted in RDS security group
- Verify RDS instance is running

### Import fails with "permission denied"
- Ensure the database user has full permissions on all tables
- Check that SSL is enabled for production in the connection config

## Latest Export Summary

The most recent export (2025-12-31) included:
- **employees**: 11 rows
- **customers**: 464 rows
- **business_info**: 1 row
- **customer_account_links**: 7 rows
- **item_attributes**: 11 rows
- **transactions**: 267 rows
- **layaway**: 12 rows
- **scrap**: 7 rows
- **quotes**: 10 rows
- **tax_config**: 13 rows
- **drawers**: 6 rows ✓
- **drawer_config**: 1 row ✓ (value: 5)
- **discrepancy_threshold**: 1 row ✓ (value: $70)
- **cash_drawer_sessions**: 13 rows ✓

**Total: 824 rows across 14 tables**

## Quick Start

```bash
# 1. Export local data
cd backend
npm run export-data

# 2. Create and configure .env.aws with your AWS RDS credentials
cp .env.aws .env.aws  # Then edit with your credentials

# 3. Import to AWS
npm run import-to-aws
```
