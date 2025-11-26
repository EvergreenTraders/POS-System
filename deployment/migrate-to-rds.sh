#!/bin/bash
# Script to migrate database from localhost to AWS RDS

# Configuration
LOCAL_HOST="localhost"
LOCAL_USER="postgres"
LOCAL_DB="postgres"

RDS_HOST="$1"  # Pass RDS endpoint as first argument
RDS_USER="postgres"
RDS_DB="pos_system"

if [ -z "$RDS_HOST" ]; then
    echo "Usage: ./migrate-to-rds.sh <RDS_ENDPOINT>"
    echo "Example: ./migrate-to-rds.sh pos-system-db.xxxxx.us-east-1.rds.amazonaws.com"
    exit 1
fi

echo "Starting database migration..."
echo "From: $LOCAL_HOST/$LOCAL_DB"
echo "To: $RDS_HOST/$RDS_DB"
echo ""

# Step 1: Export local database
echo "Step 1: Exporting local database schema..."
pg_dump -h $LOCAL_HOST -U $LOCAL_USER -d $LOCAL_DB --schema-only > deployment/schema-export.sql

echo "Step 2: Exporting local database data..."
pg_dump -h $LOCAL_HOST -U $LOCAL_USER -d $LOCAL_DB --data-only > deployment/data-export.sql

# Step 3: Test RDS connection
echo "Step 3: Testing RDS connection..."
psql -h $RDS_HOST -U $RDS_USER -d $RDS_DB -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "ERROR: Cannot connect to RDS. Check your endpoint and credentials."
    exit 1
fi

echo "Connection successful!"

# Step 4: Import schema
echo "Step 4: Importing schema to RDS..."
psql -h $RDS_HOST -U $RDS_USER -d $RDS_DB -f deployment/schema-export.sql

if [ $? -ne 0 ]; then
    echo "ERROR: Schema import failed. Check the logs above."
    exit 1
fi

# Step 5: Import data
echo "Step 5: Importing data to RDS..."
psql -h $RDS_HOST -U $RDS_USER -d $RDS_DB -f deployment/data-export.sql

if [ $? -ne 0 ]; then
    echo "WARNING: Some data may not have imported. Check the logs above."
fi

echo ""
echo "Migration complete!"
echo "Verify your data with:"
echo "psql -h $RDS_HOST -U $RDS_USER -d $RDS_DB"
