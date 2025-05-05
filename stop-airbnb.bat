@echo off
echo Stopping Airbnb API containers...
docker-compose -f docker-compose.windows.yml down
echo.
echo Containers have been stopped.
echo To start the containers again, run: start-airbnb.bat
