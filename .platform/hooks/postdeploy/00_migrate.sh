#!/bin/bash
# This hook runs after the application is deployed

cd /var/app/current/backend

# Check if migrate-with-data.js exists
if [ -f "migrate-with-data.js" ]; then
    echo "Running database migrations with data import..."
    node migrate-with-data.js
    if [ $? -eq 0 ]; then
        echo "Migrations and data import completed successfully"
    else
        echo "Migrations failed"
        exit 1
    fi
else
    echo "migrate-with-data.js not found, trying migrate.js..."
    if [ -f "migrate.js" ]; then
        echo "Running database migrations (schema only)..."
        node migrate.js
        if [ $? -eq 0 ]; then
            echo "Migrations completed successfully"
        else
            echo "Migrations failed"
            exit 1
        fi
    else
        echo "No migration files found, skipping migrations"
    fi
fi
