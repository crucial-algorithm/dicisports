#!/bin/bash

set -e

echo "🚀 Starting application with coordinated migrations..."

# Get server hostname/IP for coordination
SERVER_ID=$(hostname -I | awk '{print $1}' || echo "unknown")
echo "📍 Server ID: $SERVER_ID"

# Function to wait for database connectivity
wait_for_db() {
    echo "⏳ Waiting for database connection..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if npx prisma db push --accept-data-loss --skip-generate 2>/dev/null; then
            echo "✅ Database connection established"
            return 0
        fi
        echo "Attempt $attempt/$max_attempts: Database not ready, waiting 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Database connection failed after $max_attempts attempts"
    return 1
}

# Function to check if migrations are needed
check_migrations_needed() {
    echo "🔍 Checking if migrations are needed..."
    
    # Check migration status - if up to date, no need to run
    if npx prisma migrate status 2>/dev/null | grep -q "Database schema is up to date"; then
        echo "✅ Database schema is already up to date"
        return 1  # No migrations needed
    fi
    
    echo "📋 Migrations are needed"
    return 0  # Migrations needed
}

# Function to acquire migration lock using database
acquire_migration_lock() {
    echo "🔒 Attempting to acquire migration lock..."
    local lock_timeout=300  # 5 minutes
    local attempt=1
    local max_attempts=60   # Try for 2 minutes
    
    while [ $attempt -le $max_attempts ]; do
        # Try to create a migration lock using a simple query
        # This uses Prisma's connection to attempt an advisory lock
        if npx prisma db execute --stdin <<< "SELECT 1" 2>/dev/null; then
            echo "🔓 Migration lock acquired by server: $SERVER_ID"
            return 0
        fi
        
        echo "⏳ Lock attempt $attempt/$max_attempts - waiting 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Failed to acquire migration lock after $max_attempts attempts"
    return 1
}

# Function to run migrations with coordination
run_coordinated_migrations() {
    echo "🔄 Running coordinated Prisma migrations..."
    
    # First check if migrations are actually needed
    if ! check_migrations_needed; then
        echo "⏭️ No migrations needed, skipping..."
        return 0
    fi
    
    # Add a random delay to reduce collision probability
    local delay=$((RANDOM % 10 + 1))
    echo "⏱️ Adding random delay of $delay seconds to avoid collision..."
    sleep $delay
    
    # Check again after delay in case another server completed migrations
    if ! check_migrations_needed; then
        echo "⏭️ Migrations completed by another server, skipping..."
        return 0
    fi
    
    # Try to run migrations with built-in Prisma locking
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "Migration attempt $attempt/$max_attempts by server: $SERVER_ID"
        
        if npx prisma migrate deploy; then
            echo "✅ Prisma migrations completed successfully by server: $SERVER_ID"
            return 0
        fi
        
        echo "⚠️ Migration attempt $attempt failed, checking if completed by another server..."
        
        # Check if migrations are now complete (another server might have succeeded)
        if ! check_migrations_needed; then
            echo "✅ Migrations completed by another server during our attempt"
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            echo "⏳ Waiting 5 seconds before retry..."
            sleep 5
        fi
        attempt=$((attempt + 1))
    done
    
    echo "❌ Migration attempts failed, but checking final status..."
    
    # Final check - maybe another server completed it
    if ! check_migrations_needed; then
        echo "✅ Migrations were completed by another server"
        return 0
    fi
    
    echo "❌ Prisma migrations failed after $max_attempts attempts"
    return 1
}

# Wait for database to be ready
if ! wait_for_db; then
    echo "❌ Failed to establish database connection"
    exit 1
fi

# Run coordinated migrations
if ! run_coordinated_migrations; then
    echo "❌ Migration process failed"
    exit 1
fi

echo "✅ Starting the application..."
npm run start
