@echo off
echo Starting Airbnb API with SQL Server (New Schema)...

echo.
echo Step 1: Stopping all containers...
docker-compose -f docker-compose.windows.new-schema.yml down
docker-compose down

echo.
echo Step 2: Removing old volumes...
docker volume rm airbnb-sqlserver-data-new-schema 2>nul
echo Note: Errors about missing volumes can be ignored.

echo.
echo Step 3: Removing old networks...
docker network rm airbnb-network-new-schema 2>nul
echo Note: Errors about missing networks can be ignored.

echo.
echo Step 4: Building and starting containers with new schema...
docker-compose -f docker-compose.windows.new-schema.yml build --no-cache
docker-compose -f docker-compose.windows.new-schema.yml up -d

echo.
echo Containers are starting in the background.
echo To view logs, run: docker-compose -f docker-compose.windows.new-schema.yml logs -f
echo To stop the containers, run: docker-compose -f docker-compose.windows.new-schema.yml down
echo.
echo API will be available at: http://localhost:3004
echo SQL Server will be available at: localhost,1433
echo.
echo Note: It may take a minute or two for SQL Server to fully initialize.
echo.
echo After SQL Server initializes, you can check the database schema with:
echo check-database-schema.bat
echo.
pause
