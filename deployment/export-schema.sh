#!/bin/bash
# Script to export your local database schema for AWS RDS migration

echo "Exporting database schema from localhost..."

# Export schema only (no data)
pg_dump -h localhost -U postgres -d postgres --schema-only > deployment/schema-full.sql

echo "Schema exported to deployment/schema-full.sql"

# Export data from critical tables (optional - be careful with size)
echo "Exporting data from business_info and system_config tables..."
pg_dump -h localhost -U postgres -d postgres \
  --data-only \
  --table=business_info \
  --table=system_config \
  --table=tax_config \
  --table=employees \
  > deployment/initial-data.sql

echo "Initial data exported to deployment/initial-data.sql"

echo ""
echo "To import to AWS RDS, run:"
echo "psql -h YOUR_RDS_ENDPOINT -U postgres -d pos_system -f deployment/schema-full.sql"
echo "psql -h YOUR_RDS_ENDPOINT -U postgres -d pos_system -f deployment/initial-data.sql"
