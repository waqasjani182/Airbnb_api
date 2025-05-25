@echo off
echo Checking Database Schema
echo ======================
echo.

echo Checking if SQL Server is running...
docker ps | findstr "airbnb-sqlserver"
if %ERRORLEVEL% NEQ 0 (
    echo SQL Server container is not running!
    echo Please start the containers with: start-airbnb-new-schema.bat
    goto :end
)

echo.
echo Checking if SQL Server tools are installed...
docker exec airbnb-sqlserver bash -c "if [ -f /opt/mssql-tools/bin/sqlcmd ]; then echo 'SQL Server tools are installed.'; else echo 'SQL Server tools are not installed yet.'; fi"

echo.
echo Checking if airbnb database exists...
docker exec airbnb-sqlserver bash -c "if [ -f /opt/mssql-tools/bin/sqlcmd ]; then /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'Admin@123' -Q 'SELECT name FROM sys.databases WHERE name = \"airbnb\"'; else echo 'sqlcmd not found. SQL Server tools may not be installed yet.'; fi"

echo.
echo Checking database tables...
docker exec airbnb-sqlserver bash -c "if [ -f /opt/mssql-tools/bin/sqlcmd ]; then /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'Admin@123' -d airbnb -Q 'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \"BASE TABLE\" ORDER BY TABLE_NAME'; else echo 'sqlcmd not found. SQL Server tools may not be installed yet.'; fi"

echo.
echo Checking if tables are empty (no dummy data)...
docker exec airbnb-sqlserver bash -c "if [ -f /opt/mssql-tools/bin/sqlcmd ]; then /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'Admin@123' -d airbnb -Q 'SELECT COUNT(*) as Users_Count FROM Users; SELECT COUNT(*) as Properties_Count FROM Properties;'; else echo 'sqlcmd not found. SQL Server tools may not be installed yet.'; fi"

echo.
echo Database schema check complete.
echo.
echo If tables are missing, you may need to initialize the database:
echo 1. Stop the containers: docker-compose -f docker-compose.windows.new-schema.yml down
echo 2. Remove the volume: docker volume rm airbnb-sqlserver-data-new-schema
echo 3. Start again: start-airbnb-new-schema.bat

:end
pause
