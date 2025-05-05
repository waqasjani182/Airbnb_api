@echo off
echo Rebuilding Airbnb API containers...
docker-compose -f docker-compose.windows.yml down
docker-compose -f docker-compose.windows.yml build --no-cache
docker-compose -f docker-compose.windows.yml up -d
echo.
echo Containers have been rebuilt and started.
echo To view logs, run: docker-compose -f docker-compose.windows.yml logs -f
echo To stop the containers, run: stop-airbnb.bat
echo.
echo API will be available at: http://localhost:3004
