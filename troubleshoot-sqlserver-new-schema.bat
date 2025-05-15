@echo off
echo SQL Server Troubleshooting Script (New Schema)
echo ==========================================
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

echo Checking database tables...
docker exec airbnb-sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "Admin@123" -d airbnb -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
echo.

echo Troubleshooting complete.
echo.
echo If SQL Server is not starting, try the following:
echo 1. Increase Docker Desktop memory allocation (at least 2GB)
echo 2. Check Windows Firewall settings
echo 3. Restart Docker Desktop
echo 4. Run start-airbnb-new-schema.bat again
echo.
pause
