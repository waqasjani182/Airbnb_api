@echo off
echo Starting Airbnb API with SQL Server (Simple Version)...
docker-compose -f docker-compose.windows.simple.yml up -d
echo.
echo Containers are starting in the background.
echo To view logs, run: docker-compose -f docker-compose.windows.simple.yml logs -f
echo To stop the containers, run: docker-compose -f docker-compose.windows.simple.yml down
echo.
echo API will be available at: http://localhost:3004
