# Airbnb API with New Database Schema

This guide provides instructions for running the Airbnb API with the new database schema on Windows using Docker.

## New Schema Overview

The new database schema includes the following tables:

1. **Users** - User information
2. **Properties** - Property listings
3. **Pictures** - Property images
4. **Booking** - Booking information
5. **Booking_Review** - Reviews for bookings
6. **Facilities** - Available facilities/amenities
7. **House** - House-specific details
8. **Flat** - Flat/apartment-specific details
9. **Room** - Room-specific details
10. **Property_Facilities** - Junction table for properties and facilities
11. **Property_Facility_Rating** - Ratings for specific facilities at properties

## Getting Started

### Prerequisites

1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
2. Make sure Docker is running in Linux container mode (default)
3. Ensure ports 1433 and 3004 are not in use on your system

### Starting the Application with New Schema

1. Make sure Docker Desktop is running
2. Open Command Prompt as Administrator
3. Navigate to the project directory
4. Run the start script:
   ```
   start-airbnb-new-schema.bat
   ```

This will:
- Clean up any existing Docker resources
- Build the Docker images if they don't exist
- Create and start the containers with the new schema
- Initialize the database with the new schema

### Checking the Database Schema

After starting the application, you can check if the database schema was properly created:
```
check-database-schema.bat
```

This script will:
- Verify that SQL Server is running
- Check if the SQL Server tools are installed
- List all tables in the database
- Show sample data from the Users and Properties tables

### Viewing Logs

To view the logs of the running containers:
```
docker-compose -f docker-compose.windows.new-schema.yml logs -f
```

### Stopping the Application

To stop the containers:
```
stop-airbnb-new-schema.bat
```

### Troubleshooting

If you encounter issues, you can run the troubleshooting script:
```
troubleshoot-sqlserver-new-schema.bat
```

## Connecting to the Database

You can connect to the SQL Server database using SQL Server Management Studio (SSMS) or Azure Data Studio:

- **Server**: localhost,1433
- **Authentication**: SQL Server Authentication
- **Username**: sa
- **Password**: Admin@123
- **Database**: airbnb

## Database Schema Details

### Users Table
- user_ID (INT, PK)
- password (VARCHAR)
- name (VARCHAR)
- email (VARCHAR)
- address (VARCHAR)
- phone_No (VARCHAR)
- profile_image (VARCHAR)

### Properties Table
- property_id (INT, PK)
- user_id (INT, FK)
- property_type (VARCHAR)
- rent_per_day (DECIMAL)
- address (VARCHAR)
- rating (DECIMAL)
- city (VARCHAR)
- longitude (DECIMAL)
- latitude (DECIMAL)
- title (VARCHAR)
- description (VARCHAR)
- guest (INT)

### Pictures Table
- picture_id (INT, PK)
- property_id (INT, FK)
- image_url (VARCHAR)

### Booking Table
- booking_id (INT, PK)
- user_ID (INT, FK)
- property_id (INT, FK)
- status (VARCHAR)
- booking_date (DATE)
- start_date (DATE)
- end_date (DATE)

### Booking_Review Table
- booking_id (INT, PK, FK)
- user_ID (INT, FK)
- property_id (INT, FK)
- user_rating (DECIMAL)
- user_review (TEXT)
- owner_rating (DECIMAL)
- owner_review (TEXT)
- property_rating (DECIMAL)
- property_review (TEXT)

### Facilities Table
- facility_id (INT, PK)
- facility_type (VARCHAR)

### House Table
- property_id (INT, PK, FK)
- total_bedrooms (INT)

### Flat Table
- property_id (INT, PK, FK)
- total_rooms (INT)

### Room Table
- property_id (INT, PK, FK)
- total_beds (INT)

### Property_Facilities Table
- property_id (INT, PK, FK)
- facility_id (INT, PK, FK)

### Property_Facility_Rating Table
- property_id (INT, PK, FK)
- user_ID (INT, PK, FK)
- facility_id (INT, PK, FK)
- rating (DECIMAL)
- review (TEXT)

## Troubleshooting

If you encounter issues:

1. Check the logs:
   ```
   docker-compose -f docker-compose.windows.new-schema.yml logs -f
   ```

2. Make sure SQL Server has started properly:
   ```
   docker logs airbnb-sqlserver
   ```

3. Try connecting to the database using SQL Server Management Studio to verify it's running correctly

4. If needed, reset everything and start fresh:
   ```
   start-airbnb-new-schema.bat
   ```
