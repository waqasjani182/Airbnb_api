#!/bin/bash

echo "========================================"
echo "   AIRBNB API - QUICK CODE UPDATE"
echo "========================================"
echo

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$1/$2]${NC} $3"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

print_success() {
    echo -e "${GREEN}SUCCESS:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

# Check if Docker is running
if ! docker version >/dev/null 2>&1; then
    print_error "Docker is not running or not installed!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

print_status "1" "4" "Stopping API container (keeping database running)..."
docker-compose -f docker-compose.windows.new-schema.yml stop api 2>/dev/null || true

echo
print_status "2" "4" "Rebuilding only the API container with code changes..."
echo "This should be much faster as it reuses cached layers..."
if ! docker-compose -f docker-compose.windows.new-schema.yml build api; then
    echo
    print_error "Docker build failed!"
    echo "Please check the error messages above."
    echo
    print_warning "If you're getting dependency errors, you may need to run rebuild-project.sh instead."
    exit 1
fi

echo
print_status "3" "4" "Starting the updated API container..."
if ! docker-compose -f docker-compose.windows.new-schema.yml up -d api; then
    echo
    print_error "Failed to start API container!"
    echo "Please check the error messages above."
    exit 1
fi

echo
print_status "4" "4" "Verifying all services are running..."
docker-compose -f docker-compose.windows.new-schema.yml ps

echo
echo "========================================"
print_success "CODE UPDATE COMPLETED SUCCESSFULLY!"
echo "========================================"
echo
echo "Services status:"
echo "- SQL Server: Running (data preserved)"
echo "- API Server: Updated and restarted"
echo
echo "API Server: http://localhost:3004"
echo
echo "To view API logs, run:"
echo "  docker-compose -f docker-compose.windows.new-schema.yml logs -f api"
echo
echo "To view all logs, run:"
echo "  docker-compose -f docker-compose.windows.new-schema.yml logs -f"
echo

# Optional: Show recent API logs
echo "Recent API logs:"
echo "=================="
docker-compose -f docker-compose.windows.new-schema.yml logs --tail=20 api

echo
# Wait for user input on macOS
read -p "Press any key to continue..."
