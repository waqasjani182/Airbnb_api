@echo off
echo Cleaning up Docker resources and starting Airbnb API...

echo.
echo Step 1: Stopping all containers...
docker-compose -f docker-compose.windows.simple.yml down
docker-compose down

echo.
echo Step 2: Removing old volumes...
docker volume rm airbnb-sqlserver-data airbnb_api_sqlserver-data 2>nul
echo Note: Errors about missing volumes can be ignored.

echo.
echo Step 3: Removing old networks...
docker network rm airbnb-network airbnb_api_airbnb-network 2>nul
echo Note: Errors about missing networks can be ignored.

echo.
echo Step 4: Pruning unused Docker resources...
docker system prune -f

echo.
echo Step 5: Building and starting containers...
docker-compose -f docker-compose.windows.simple.yml up -d

echo.
echo Containers are starting in the background.
echo To view logs, run: docker-compose -f docker-compose.windows.simple.yml logs -f
echo To stop the containers, run: docker-compose -f docker-compose.windows.simple.yml down
echo.
echo API will be available at: http://localhost:3004
echo.
echo Note: It may take a minute or two for SQL Server to fully initialize.
echo.
pause
