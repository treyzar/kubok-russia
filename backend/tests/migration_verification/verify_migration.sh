#!/bin/bash

# Migration Verification Script for room_places table
# This script tests the forward and backward migration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection
DB_STRING="postgres://admin:password@localhost:5432/project_db?sslmode=disable"

echo -e "${YELLOW}=== Room Places Migration Verification ===${NC}\n"

# Function to run SQL and return results
run_sql() {
    psql "$DB_STRING" -t -c "$1"
}

# Function to check if column exists
column_exists() {
    local table=$1
    local column=$2
    local result=$(psql "$DB_STRING" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='$table' AND column_name='$column';")
    echo $result | xargs
}

# Function to check if table exists
table_exists() {
    local table=$1
    local result=$(psql "$DB_STRING" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='$table';")
    echo $result | xargs
}

echo -e "${YELLOW}Step 1: Check current migration status${NC}"
CURRENT_VERSION=$(GOOSE_DRIVER=postgres GOOSE_DBSTRING="$DB_STRING" GOOSE_MIGRATION_DIR=./db/migrations goose status 2>/dev/null | grep "Applied At" | tail -1 | awk '{print $1}' || echo "0")
echo "Current migration version: $CURRENT_VERSION"

echo -e "\n${YELLOW}Step 2: Setup test data (if needed)${NC}"
# Check if we need to rollback first
if [ "$(table_exists 'room_places')" == "1" ]; then
    echo "room_places table exists, rolling back to test forward migration..."
    GOOSE_DRIVER=postgres GOOSE_DBSTRING="$DB_STRING" GOOSE_MIGRATION_DIR=./db/migrations goose down
    echo "Rolled back one migration"
fi

# Insert test data with places column
echo "Inserting test data..."
psql "$DB_STRING" <<EOF
-- Ensure we have test users
INSERT INTO users (id, name, bot) 
VALUES 
    (9001, 'test_user_1', false),
    (9002, 'test_user_2', false),
    (9003, 'test_user_3', false)
ON CONFLICT (id) DO NOTHING;

-- Create test rooms
INSERT INTO rooms (room_id, entry_cost, status, winner_pct, players_needed, created_at)
VALUES 
    (9001, 100, 'new', 90, 10, NOW()),
    (9002, 200, 'new', 90, 10, NOW())
ON CONFLICT (room_id) DO NOTHING;

-- Insert room_players with various places values
INSERT INTO room_players (room_id, user_id, places, joined_at)
VALUES 
    (9001, 9001, 2, NOW() - INTERVAL '5 minutes'),
    (9001, 9002, 1, NOW() - INTERVAL '4 minutes'),
    (9001, 9003, 3, NOW() - INTERVAL '3 minutes'),
    (9002, 9001, 1, NOW() - INTERVAL '2 minutes'),
    (9002, 9002, 4, NOW() - INTERVAL '1 minute')
ON CONFLICT (room_id, user_id) DO UPDATE SET places = EXCLUDED.places;
EOF

echo "Test data inserted"

# Verify test data before migration
echo -e "\n${YELLOW}Step 3: Verify data before migration${NC}"
echo "Room players with places:"
psql "$DB_STRING" -t -c "SELECT room_id, user_id, places FROM room_players WHERE room_id IN (9001, 9002) ORDER BY room_id, user_id;" | head -20

# Store counts for verification
TOTAL_PLACES=$(run_sql "SELECT COALESCE(SUM(places), 0) FROM room_players WHERE room_id IN (9001, 9002);")
TOTAL_PLACES=$(echo $TOTAL_PLACES | xargs)
echo "Total places to migrate: $TOTAL_PLACES"

echo -e "\n${YELLOW}Step 4: Run forward migration${NC}"
GOOSE_DRIVER=postgres GOOSE_DBSTRING="$DB_STRING" GOOSE_MIGRATION_DIR=./db/migrations goose up
echo "Migration applied"

echo -e "\n${YELLOW}Step 5: Verify forward migration results${NC}"

# Check if room_places table exists
if [ "$(table_exists 'room_places')" == "1" ]; then
    echo -e "${GREEN}✓ room_places table created${NC}"
else
    echo -e "${RED}✗ room_places table NOT created${NC}"
    exit 1
fi

# Check if places column was removed
if [ "$(column_exists 'room_players' 'places')" == "0" ]; then
    echo -e "${GREEN}✓ places column removed from room_players${NC}"
else
    echo -e "${RED}✗ places column still exists in room_players${NC}"
    exit 1
fi

# Verify data migration
echo -e "\nMigrated room_places data:"
psql "$DB_STRING" -t -c "SELECT room_id, user_id, place_index FROM room_places WHERE room_id IN (9001, 9002) ORDER BY room_id, place_index;" | head -20

# Count migrated places
MIGRATED_PLACES=$(run_sql "SELECT COUNT(*) FROM room_places WHERE room_id IN (9001, 9002);")
echo -e "\nTotal places migrated: $MIGRATED_PLACES"

# Trim whitespace for comparison
TOTAL_PLACES=$(echo $TOTAL_PLACES | xargs)
MIGRATED_PLACES=$(echo $MIGRATED_PLACES | xargs)

if [ "$TOTAL_PLACES" == "$MIGRATED_PLACES" ]; then
    echo -e "${GREEN}✓ All places migrated correctly${NC}"
else
    echo -e "${RED}✗ Place count mismatch: expected $TOTAL_PLACES, got $MIGRATED_PLACES${NC}"
    exit 1
fi

# Verify sequential place_index per room
echo -e "\n${YELLOW}Step 6: Verify place_index sequencing${NC}"

# Check Room 9001 (should have indices 1-6: user1=1,2, user2=3, user3=4,5,6)
ROOM1_INDICES=$(run_sql "SELECT array_agg(place_index ORDER BY place_index) FROM room_places WHERE room_id = 9001;")
echo "Room 9001 place indices: $ROOM1_INDICES"

# Check Room 9002 (should have indices 1-5: user1=1, user2=2,3,4,5)
ROOM2_INDICES=$(run_sql "SELECT array_agg(place_index ORDER BY place_index) FROM room_places WHERE room_id = 9002;")
echo "Room 9002 place indices: $ROOM2_INDICES"

# Verify user place counts
echo -e "\nPlace counts per user:"
psql "$DB_STRING" -t -c "SELECT room_id, user_id, COUNT(*) as place_count FROM room_places WHERE room_id IN (9001, 9002) GROUP BY room_id, user_id ORDER BY room_id, user_id;" | head -20

echo -e "\n${YELLOW}Step 7: Test rollback migration${NC}"
GOOSE_DRIVER=postgres GOOSE_DBSTRING="$DB_STRING" GOOSE_MIGRATION_DIR=./db/migrations goose down
echo "Rollback applied"

echo -e "\n${YELLOW}Step 8: Verify rollback results${NC}"

# Check if room_places table was dropped
if [ "$(table_exists 'room_places')" == "0" ]; then
    echo -e "${GREEN}✓ room_places table dropped${NC}"
else
    echo -e "${RED}✗ room_places table still exists${NC}"
    exit 1
fi

# Check if places column was restored
if [ "$(column_exists 'room_players' 'places')" == "1" ]; then
    echo -e "${GREEN}✓ places column restored to room_players${NC}"
else
    echo -e "${RED}✗ places column NOT restored${NC}"
    exit 1
fi

# Verify data was restored
echo -e "\nRestored room_players data:"
psql "$DB_STRING" -t -c "SELECT room_id, user_id, places FROM room_players WHERE room_id IN (9001, 9002) ORDER BY room_id, user_id;" | head -20

# Verify place counts match original
echo -e "\n${YELLOW}Step 9: Verify data integrity after rollback${NC}"
RESTORED_TOTAL=$(run_sql "SELECT COALESCE(SUM(places), 0) FROM room_players WHERE room_id IN (9001, 9002);")
echo "Total places after rollback: $RESTORED_TOTAL"

# Trim whitespace for comparison
RESTORED_TOTAL=$(echo $RESTORED_TOTAL | xargs)

if [ "$TOTAL_PLACES" == "$RESTORED_TOTAL" ]; then
    echo -e "${GREEN}✓ All places restored correctly${NC}"
else
    echo -e "${RED}✗ Place count mismatch after rollback: expected $TOTAL_PLACES, got $RESTORED_TOTAL${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Step 10: Re-apply migration for final state${NC}"
GOOSE_DRIVER=postgres GOOSE_DBSTRING="$DB_STRING" GOOSE_MIGRATION_DIR=./db/migrations goose up
echo "Migration re-applied"

echo -e "\n${YELLOW}Step 11: Cleanup test data${NC}"
psql "$DB_STRING" <<EOF
DELETE FROM room_players WHERE room_id IN (9001, 9002);
DELETE FROM rooms WHERE room_id IN (9001, 9002);
DELETE FROM users WHERE id IN (9001, 9002, 9003);
EOF
echo "Test data cleaned up"

echo -e "\n${GREEN}=== All migration verification tests passed! ===${NC}"
