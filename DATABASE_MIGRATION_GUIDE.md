# Database Migration Guide

This guide explains how to run database migrations for your POS System when deploying to production.

---

## Setup (One-Time)

### Required GitHub Secrets

Add these secrets to your GitHub repository for database migrations:

Go to: https://github.com/EvergreenTraders/POS-System/settings/secrets/actions

Add the following secrets:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `DB_HOST` | Your RDS endpoint | `pos-system-db.xxxxx.ca-central-1.rds.amazonaws.com` |
| `DB_USER` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `your-strong-password` |
| `DB_NAME` | Database name | `pos_system` |
| `DB_PORT` | PostgreSQL port | `5432` |

### How to Find Your RDS Endpoint:

1. Go to AWS Console → RDS → Databases
2. Click on your database (`pos-system-db`)
3. Copy the "Endpoint" value (under Connectivity & security)

---

## Running Migrations

### When to Run Migrations:

Run migrations when:
- ✅ You've added new database tables
- ✅ You've modified existing table schemas
- ✅ You've added new columns or indexes
- ✅ After deploying code that requires database changes
- ✅ First time deploying to production

### How to Run Migrations:

1. **Go to GitHub Actions**: https://github.com/EvergreenTraders/POS-System/actions

2. **Click "Deploy to AWS"** workflow

3. **Click "Run workflow"** button

4. **Configure the workflow**:
   - **Branch**: Select `main`
   - **Environment**: Select `production`
   - **Run database migrations**: Select `true` ⬅️ **Important!**

5. **Click "Run workflow"**

6. **Monitor the progress**:
   - Watch the "Deploy Backend to Elastic Beanstalk" job complete first
   - Then "Run Database Migrations" job will start automatically
   - Check logs for any errors

---

## What Gets Migrated

The workflow runs these SQL files in order:

1. `employees.sql` - Employee management tables
2. `customers.sql` - Customer data tables
3. `business_info.sql` - Business configuration
4. `inventory.sql` - Inventory management
5. `system_config.sql` - System configuration (including attribute_config)
6. `item_attributes.sql` - Item attributes tables
7. `item_history.sql` - Item change history
8. `transactions.sql` - Transaction records
9. `customer_ticket.sql` - Customer tickets
10. `layaway.sql` - Layaway management
11. `scrap.sql` - Scrap management
12. `metal_estimator.sql` - Metal estimation
13. `gem_estimator.sql` - Gem estimation
14. `quotes.sql` - Quote management
15. `tax_config.sql` - Tax configuration
16. `add_performance_indexes.sql` - Database indexes

---

## Safety Features

### Built-in Protections:

1. **Optional by default**: Migrations don't run unless you explicitly select "true"
2. **Runs after backend deployment**: Only runs if backend deploys successfully
3. **Error handling**: Stops on first error (`ON_ERROR_STOP=1`)
4. **Idempotent SQL**: Most tables use `CREATE TABLE IF NOT EXISTS`
5. **Ordered execution**: Runs files in dependency order

### Before Running Migrations:

⚠️ **ALWAYS backup your RDS database first!**

#### How to Backup RDS:

1. Go to AWS Console → RDS → Databases
2. Select your database
3. Click **Actions** → **Take snapshot**
4. Name it: `pos-system-backup-YYYY-MM-DD`
5. Wait for snapshot to complete (5-10 minutes)
6. Then run migrations

---

## Troubleshooting

### Migration Job Fails

**Problem**: Migration job shows errors in GitHub Actions

**Solution**:
1. Check the logs for the specific SQL file that failed
2. Common issues:
   - Table already exists (usually safe to ignore)
   - Foreign key constraint violations
   - Syntax errors in SQL

### Database Connection Fails

**Problem**: `could not connect to server` error

**Solution**:
1. Check RDS security group allows connections from GitHub Actions IPs
2. Verify `DB_HOST` secret is correct
3. Check RDS is publicly accessible (for migrations)
4. Verify `DB_PASSWORD` secret is correct

### Migrations Ran But Data Still Missing

**Problem**: Migrations completed but production data is not updated

**Solution**:
- Migrations create **tables and schema** only
- They don't copy data from your local database
- You need to manually insert/import data if needed

---

## Manual Migration (Alternative)

If automated migrations fail, you can run manually:

### Option 1: Using pgAdmin or DBeaver

1. Connect to your RDS database using pgAdmin/DBeaver
2. Run each SQL file from `backend/database/` folder
3. Execute in the order listed above

### Option 2: Using Command Line

```bash
# Set your RDS details
export DB_HOST="your-rds-endpoint.rds.amazonaws.com"
export DB_NAME="pos_system"
export DB_USER="postgres"
export DB_PORT="5432"

# Run migrations
cd backend/database
for file in employees.sql customers.sql business_info.sql inventory.sql system_config.sql item_attributes.sql item_history.sql transactions.sql customer_ticket.sql layaway.sql scrap.sql metal_estimator.sql gem_estimator.sql quotes.sql tax_config.sql add_performance_indexes.sql; do
  echo "Running $file..."
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f $file
done
```

---

## Common Scenarios

### Scenario 1: First Deployment

**Situation**: Deploying to production for the first time

**Steps**:
1. Backup RDS (take snapshot)
2. Run deployment with migrations enabled (`run_migrations: true`)
3. Verify tables were created by connecting to RDS
4. Test the application

### Scenario 2: Code Update (No Database Changes)

**Situation**: Deploying code changes but database schema unchanged

**Steps**:
1. Run deployment with migrations disabled (`run_migrations: false`)
2. No database changes will occur

### Scenario 3: Schema Update

**Situation**: Added new columns or tables locally, need to update production

**Steps**:
1. Backup RDS (take snapshot)
2. Update the SQL files in `backend/database/` with new schema
3. Commit and push changes
4. Run deployment with migrations enabled (`run_migrations: true`)
5. Verify schema changes in RDS

---

## Best Practices

### ✅ DO:

- Always backup before running migrations
- Test migrations on a staging database first
- Review SQL files before running
- Run migrations during low-traffic periods
- Monitor the migration job logs

### ❌ DON'T:

- Don't run migrations without a backup
- Don't modify running migrations
- Don't delete migration files after running
- Don't run migrations during peak hours
- Don't skip checking the logs

---

## FAQ

**Q: Do migrations run automatically on every deployment?**

A: No, migrations only run when you explicitly select "true" for "Run database migrations" in the workflow.

**Q: Can I rollback a migration if something goes wrong?**

A: Restore from the RDS snapshot you created before running migrations.

**Q: How do I know if migrations were successful?**

A: Check the "Run Database Migrations" job logs in GitHub Actions. Each file will show ✓ if successful.

**Q: What if a table already exists?**

A: Most SQL files use `CREATE TABLE IF NOT EXISTS`, so they won't error if tables exist.

**Q: Can I add custom migrations?**

A: Yes, add your SQL file to `backend/database/` and add it to the `MIGRATION_FILES` array in the workflow.

---

## Support

If migrations fail:
1. Check GitHub Actions logs for specific error
2. Verify all GitHub secrets are set correctly
3. Ensure RDS security group allows connections
4. Check this guide's Troubleshooting section
5. Try manual migration as fallback

---

## Summary

**Quick Checklist**:
- [ ] Add database secrets to GitHub (one-time setup)
- [ ] Backup RDS before running migrations
- [ ] Run deployment with `run_migrations: true`
- [ ] Monitor job logs
- [ ] Verify changes in production database
- [ ] Test application after migration
