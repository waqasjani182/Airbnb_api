@echo off
echo Stopping Airbnb API containers with new schema...
docker-compose -f docker-compose.windows.new-schema.yml down
echo.
echo Containers have been stopped.
echo To start the containers again, run: start-airbnb-new-schema.bat
