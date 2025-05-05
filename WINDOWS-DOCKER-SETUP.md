# Windows Docker Setup for Airbnb API

This guide provides instructions for running the Airbnb API with SQL Server on Windows using Docker.

## Prerequisites

1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
2. Make sure Docker is running in Linux container mode (default)
3. Ensure ports 1433 and 3004 are not in use on your system

## Files Included

- `docker-compose.windows.yml` - Docker Compose configuration optimized for Windows
- `Dockerfile.windows` - Dockerfile with Windows-specific adjustments
- `start-airbnb.bat` - Batch file to start the containers
- `stop-airbnb.bat` - Batch file to stop the containers
- `rebuild-airbnb.bat` - Batch file to rebuild and restart the containers

## Getting Started

### First-time Setup

1. Make sure Docker Desktop is running
2. Open Command Prompt as Administrator
3. Navigate to the project directory
4. Run the start script:
   ```
   start-airbnb.bat
   ```

This will:
- Build the Docker images if they don't exist
- Create and start the containers
- Initialize the database

### Viewing Logs

To view the logs of the running containers:
```
docker-compose -f docker-compose.windows.yml logs -f
```

### Stopping the Application

To stop the containers:
```
stop-airbnb.bat
```

### Rebuilding After Code Changes

If you make changes to the code, you need to rebuild the containers:
```
rebuild-airbnb.bat
```

## Troubleshooting

### Port Conflicts

If you see errors about ports being in use:

1. Check if another application is using port 1433 or 3004:
   ```
   netstat -ano | findstr :1433
   netstat -ano | findstr :3004
   ```

2. Either stop the other application or change the ports in `docker-compose.windows.yml`

### SQL Server Connection Issues

If the API can't connect to SQL Server:

1. Check the SQL Server logs:
   ```
   docker logs airbnb-sqlserver
   ```

2. Make sure SQL Server is running:
   ```
   docker ps
   ```

3. Try connecting to SQL Server using SQL Server Management Studio:
   - Server: localhost,1433
   - Authentication: SQL Server Authentication
   - Username: sa
   - Password: Admin@123

### Data Persistence

The SQL Server data is stored in a named volume `airbnb-sqlserver-data`. This ensures your data persists across container restarts.

To view all volumes:
```
docker volume ls
```

## Important Notes

- The database and tables are created automatically on first startup
- Any changes to the database schema should be made through migration scripts
- The API will be available at http://localhost:3004
- SQL Server is accessible at localhost:1433
