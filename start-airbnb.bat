@echo off
echo Starting Airbnb API with SQL Server...
docker-compose -f docker-compose.windows.yml up -d
echo.
echo Containers are starting in the background.
echo To view logs, run: docker-compose -f docker-compose.windows.yml logs -f
echo To stop the containers, run: stop-airbnb.bat
echo.
echo API will be available at: http://localhost:3004
