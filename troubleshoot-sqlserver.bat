@echo off
echo SQL Server Troubleshooting Script
echo ===============================
echo.

echo Checking Docker status...
docker info
echo.

echo Checking running containers...
docker ps -a
echo.

echo Checking SQL Server logs...
docker logs airbnb-sqlserver
echo.

echo Checking Docker volumes...
docker volume ls
echo.

echo Checking Docker networks...
docker network ls
echo.

echo Checking Docker resources...
docker system df
echo.

echo Checking if SQL Server is accepting connections...
docker exec airbnb-sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "Admin@123" -Q "SELECT @@VERSION"
echo.

echo Troubleshooting complete.
echo.
echo If SQL Server is not starting, try the following:
echo 1. Increase Docker Desktop memory allocation (at least 2GB)
echo 2. Try using the simple version: start-airbnb-simple.bat
echo 3. Check Windows Firewall settings
echo 4. Restart Docker Desktop
echo.
pause
