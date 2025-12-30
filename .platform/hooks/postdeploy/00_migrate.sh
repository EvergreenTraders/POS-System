#!/bin/bash
# This hook runs after the application is deployed

cd /var/app/current

# Check if migrate.js exists
if [ -f "migrate.js" ]; then
    echo "Running database migrations..."
    node migrate.js
    if [ $? -eq 0 ]; then
        echo "Migrations completed successfully"
    else
        echo "Migrations failed"
        exit 1
    fi
else
    echo "migrate.js not found, skipping migrations"
fi
