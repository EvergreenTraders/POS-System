# Database Migration with Data Import - Guide

This guide explains how the automated database migration and data import works when deploying to AWS.

## Overview

The system now supports **automatic data migration** from your local database to AWS during deployment. This means:
- ✅ Database schema is created/updated on AWS
- ✅ Data from your local database is exported and imported to AWS
- ✅ Transaction IDs, system configs, and all data are preserved

## How It Works

### 1. Local Data Export (During Deployment)

When you deploy with migrations enabled, the GitHub Actions workflow automatically:

```bash
# Exports your local database data
node export-data.js
```

This creates:
- `backend/data-exports/database-export-TIMESTAMP.json` (timestamped backup)
- `backend/data-export.json` (file included in deployment package)

### 2. Deployment Package

The deployment package includes:
- All backend code
- Database schema migration files (`backend/database/*.sql`)
- **Data export file** (`backend/data-export.json`)
- Migration script (`backend/migrate-with-data.js`)

### 3. Post-Deploy Migration

After deployment, the post-deploy hook runs automatically:

```bash
# On AWS server after deployment
cd /var/app/current/backend
node migrate-with-data.js
```

This script:
1. **Runs schema migrations** - Creates/updates all database tables
2. **Imports data** - Inserts all data from `data-export.json` into AWS database

## Manual Usage

### Export Local Data

```bash
cd backend
npm run export-data
```

This creates a timestamped export in `backend/data-exports/` and a deployment copy at `backend/data-export.json`.

### Import Data to AWS Manually

If you need to import data manually to AWS:

```bash
# 1. First, export your local data
npm run export-data

# 2. Then import to AWS (requires .env.aws file)
npm run import-to-aws
```

### Run Migrations Only (No Data)

If you want to run just schema migrations without data import, use the old script:

```bash
node migrate.js
```

## GitHub Secrets Required

For the automated data export during deployment, add these secrets to your GitHub repository:

- `LOCAL_DB_HOST` - Your local database host (or a database you want to export from)
- `LOCAL_DB_USER` - Database username
- `LOCAL_DB_PASSWORD` - Database password
- `LOCAL_DB_NAME` - Database name (usually `postgres`)
- `LOCAL_DB_PORT` - Database port (usually `5432`)

**Note:** These can point to any database you want to export from (local, staging, etc.)

## Deployment Process

1. **Commit your changes**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```

2. **Run GitHub Actions Workflow**
   - Go to GitHub Actions tab
   - Click "Deploy to AWS"
   - Click "Run workflow"
   - Select `run_migrations: true`
   - Click "Run workflow" button

3. **What Happens:**
   - ✅ Exports data from the database specified in GitHub Secrets
   - ✅ Builds deployment package (including data export)
   - ✅ Deploys to AWS Elastic Beanstalk
   - ✅ Runs schema migrations on AWS
   - ✅ Imports data to AWS database
   - ✅ Deploys frontend to S3

## Files

### Migration Scripts

- **`migrate.js`** - Schema-only migrations (old)
- **`migrate-with-data.js`** - Schema + data migrations (new)
- **`export-data.js`** - Exports database to JSON
- **`import-data.js`** - Imports JSON to database
- **`import-to-aws.js`** - Imports to AWS (uses `.env.aws`)

### Configuration

- **`.platform/hooks/postdeploy/00_migrate.sh`** - Post-deploy hook that runs migrations
- **`.github/workflows/deploy.yml`** - GitHub Actions deployment workflow
- **`database/*.sql`** - Schema migration files

### Data Files

- **`data-export.json`** - Deployment data export (generated, included in package)
- **`data-exports/`** - Directory of timestamped exports (not deployed)

## Tables Exported

The following tables are automatically exported and imported:

**Core Tables:**
- employees
- customers
- business_info
- system_config
- pawn_config
- tax_config
- cases_config

**Inventory:**
- jewelry
- jewelry_secondary_gems
- jewelry_item_history
- storage_location

**Transactions:**
- transactions
- transaction_items
- transaction_types
- payment_methods
- payments

**Tickets:**
- pawn_ticket
- buy_ticket
- sale_ticket

**Other:**
- layaway, layaway_payments
- scrap_buckets, scrap_items
- quotes, quote_items
- customer_account_links
- customer_headers_preferences
- linked_account_authorization
- cash_drawer_sessions

## Important Notes

⚠️ **Data is preserved** - The import uses `ON CONFLICT DO NOTHING`, which means existing data in AWS won't be overwritten. If you need to replace data, you'll need to manually truncate tables first.

⚠️ **Large databases** - For very large databases (>100MB), the data export might take time and increase deployment size. Consider selective export if needed.

⚠️ **Security** - The data export file contains all your database data. It's excluded from git via `.gitignore` but is included in the deployment package.

## Troubleshooting

### "Data export file not found"
- The migration will continue with schema-only updates
- Data import is skipped
- This is normal if you don't have LOCAL_DB_* secrets configured

### "Migration failed at X.sql"
- Check the error message in deployment logs
- Usually indicates a SQL syntax error or missing dependency
- Fix the SQL file and redeploy

### "Could not insert row into table"
- Usually a constraint violation (foreign key, unique, etc.)
- The import continues with other rows
- Check AWS database logs for details

### Data not appearing in AWS
- Verify GitHub Secrets are set correctly
- Check deployment logs for export success
- Verify `data-export.json` was created (check workflow logs)
- Check AWS logs for import errors

## Example Workflow

```bash
# 1. Make changes locally
# ... develop features ...

# 2. Export data for testing
cd backend
npm run export-data

# 3. Commit changes
git add .
git commit -m "Add new feature with data"
git push

# 4. Deploy via GitHub Actions
# Select run_migrations: true in GitHub UI

# 5. Verify deployment
# Check AWS application - data should be migrated
```

## Rollback

If you need to rollback:

1. **Schema rollback:** Not automated - you'll need to manually revert SQL changes
2. **Data rollback:** Use the timestamped export files in `data-exports/` directory

Keep local backups of `data-exports/` directory for disaster recovery!
