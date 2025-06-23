#!/bin/bash

echo "========================================"
echo "   AIRBNB API - COMPLETE PROJECT REBUILD"
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

print_status "1" "6" "Stopping and removing existing containers..."
docker-compose -f docker-compose.windows.new-schema.yml down --volumes --remove-orphans 2>/dev/null || true
docker-compose -f docker-compose.yml down --volumes --remove-orphans 2>/dev/null || true

echo
print_status "2" "6" "Removing existing images..."
docker rmi airbnb_api-api 2>/dev/null || true
docker rmi airbnb_api_api 2>/dev/null || true
docker image prune -f

echo
print_status "3" "6" "Cleaning up Docker system..."
docker system prune -f
docker volume prune -f

echo
print_status "4" "6" "Removing node_modules and package-lock.json for fresh install..."
if [ -d "node_modules" ]; then
    echo "Removing node_modules directory..."
    rm -rf node_modules
fi
if [ -f "package-lock.json" ]; then
    echo "Removing package-lock.json..."
    rm -f package-lock.json
fi

echo
print_status "5" "6" "Building Docker images from scratch..."
echo "This may take several minutes as it will download and install everything..."
if ! docker-compose -f docker-compose.windows.new-schema.yml build --no-cache --pull; then
    echo
    print_error "Docker build failed!"
    echo "Please check the error messages above."
    exit 1
fi

echo
print_status "6" "6" "Starting the complete application..."
if ! docker-compose -f docker-compose.windows.new-schema.yml up -d; then
    echo
    print_error "Failed to start containers!"
    echo "Please check the error messages above."
    exit 1
fi

echo
echo "========================================"
print_success "REBUILD COMPLETED SUCCESSFULLY!"
echo "========================================"
echo
echo "Services starting up:"
echo "- SQL Server: http://localhost:1433"
echo "- API Server: http://localhost:3004"
echo
echo "Checking container status..."
docker-compose -f docker-compose.windows.new-schema.yml ps

echo
echo "To view logs, run:"
echo "  docker-compose -f docker-compose.windows.new-schema.yml logs -f"
echo
echo "To stop the application, run:"
echo "  docker-compose -f docker-compose.windows.new-schema.yml down"
echo
echo "Default admin user will be created:"
echo "  Email: admin@admin.com"
echo "  Password: admin123"
echo

# Wait for user input on macOS
read -p "Press any key to continue..."
