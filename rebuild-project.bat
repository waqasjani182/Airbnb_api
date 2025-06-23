@echo off
echo ========================================
echo    AIRBNB API - COMPLETE PROJECT REBUILD
echo ========================================
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running or not installed!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [1/6] Stopping and removing existing containers...
docker-compose -f docker-compose.windows.new-schema.yml down --volumes --remove-orphans 2>nul
docker-compose -f docker-compose.yml down --volumes --remove-orphans 2>nul

echo.
echo [2/6] Removing existing images...
docker rmi airbnb_api-api 2>nul
docker rmi airbnb_api_api 2>nul
docker image prune -f

echo.
echo [3/6] Cleaning up Docker system...
docker system prune -f
docker volume prune -f

echo.
echo [4/6] Removing node_modules and package-lock.json for fresh install...
if exist node_modules (
    echo Removing node_modules directory...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo Removing package-lock.json...
    del package-lock.json
)

echo.
echo [5/6] Building Docker images from scratch...
echo This may take several minutes as it will download and install everything...
docker-compose -f docker-compose.windows.new-schema.yml build --no-cache --pull

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Docker build failed!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo [6/6] Starting the complete application...
docker-compose -f docker-compose.windows.new-schema.yml up -d

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start containers!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo    REBUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Services starting up:
echo - SQL Server: http://localhost:1433
echo - API Server: http://localhost:3004
echo.
echo Checking container status...
docker-compose -f docker-compose.windows.new-schema.yml ps

echo.
echo To view logs, run:
echo   docker-compose -f docker-compose.windows.new-schema.yml logs -f
echo.
echo To stop the application, run:
echo   docker-compose -f docker-compose.windows.new-schema.yml down
echo.
echo Default admin user will be created:
echo   Email: admin@admin.com
echo   Password: admin123
echo.

pause
