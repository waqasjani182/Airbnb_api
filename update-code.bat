@echo off
echo ========================================
echo    AIRBNB API - QUICK CODE UPDATE
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

echo [1/4] Stopping API container (keeping database running)...
docker-compose -f docker-compose.windows.new-schema.yml stop api 2>nul

echo.
echo [2/4] Rebuilding only the API container with code changes...
echo This should be much faster as it reuses cached layers...
docker-compose -f docker-compose.windows.new-schema.yml build api

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Docker build failed!
    echo Please check the error messages above.
    echo.
    echo If you're getting dependency errors, you may need to run rebuild-project.bat instead.
    pause
    exit /b 1
)

echo.
echo [3/4] Starting the updated API container...
docker-compose -f docker-compose.windows.new-schema.yml up -d api

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start API container!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo [4/4] Verifying all services are running...
docker-compose -f docker-compose.windows.new-schema.yml ps

echo.
echo ========================================
echo    CODE UPDATE COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Services status:
echo - SQL Server: Running (data preserved)
echo - API Server: Updated and restarted
echo.
echo API Server: http://localhost:3004
echo.
echo To view API logs, run:
echo   docker-compose -f docker-compose.windows.new-schema.yml logs -f api
echo.
echo To view all logs, run:
echo   docker-compose -f docker-compose.windows.new-schema.yml logs -f
echo.

REM Optional: Show recent API logs
echo Recent API logs:
echo ==================
docker-compose -f docker-compose.windows.new-schema.yml logs --tail=20 api

echo.
pause
