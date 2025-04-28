const db = require('../config/db');

// Get all properties with pagination and filtering
const getAllProperties = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      city, 
      min_price, 
      max_price, 
      bedrooms, 
      property_type 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build the query with filters
    let query = `
      SELECT p.*, u.first_name as host_first_name, u.last_name as host_last_name,
      (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = true LIMIT 1) as primary_image
      FROM properties p
      JOIN users u ON p.host_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    if (city) {
      query += ` AND LOWER(p.city) = LOWER($${paramIndex})`;
      queryParams.push(city);
      paramIndex++;
    }
    
    if (min_price) {
      query += ` AND p.price_per_night >= $${paramIndex}`;
      queryParams.push(min_price);
      paramIndex++;
    }
    
    if (max_price) {
      query += ` AND p.price_per_night <= $${paramIndex}`;
      queryParams.push(max_price);
      paramIndex++;
    }
    
    if (bedrooms) {
      query += ` AND p.bedrooms >= $${paramIndex}`;
      queryParams.push(bedrooms);
      paramIndex++;
    }
    
    if (property_type) {
      query += ` AND LOWER(p.property_type) = LOWER($${paramIndex})`;
      queryParams.push(property_type);
      paramIndex++;
    }
    
    // Add pagination
    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);
    
    // Execute query
    const result = await db.query(query, queryParams);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) FROM properties p
      WHERE 1=1
    `;
    
    // Apply the same filters to count query
    let countQueryParams = [];
    let countParamIndex = 1;
    let countQueryWithFilters = countQuery;
    
    if (city) {
      countQueryWithFilters += ` AND LOWER(p.city) = LOWER($${countParamIndex})`;
      countQueryParams.push(city);
      countParamIndex++;
    }
    
    if (min_price) {
      countQueryWithFilters += ` AND p.price_per_night >= $${countParamIndex}`;
      countQueryParams.push(min_price);
      countParamIndex++;
    }
    
    if (max_price) {
      countQueryWithFilters += ` AND p.price_per_night <= $${countParamIndex}`;
      countQueryParams.push(max_price);
      countParamIndex++;
    }
    
    if (bedrooms) {
      countQueryWithFilters += ` AND p.bedrooms >= $${countParamIndex}`;
      countQueryParams.push(bedrooms);
      countParamIndex++;
    }
    
    if (property_type) {
      countQueryWithFilters += ` AND LOWER(p.property_type) = LOWER($${countParamIndex})`;
      countQueryParams.push(property_type);
      countParamIndex++;
    }
    
    const countResult = await db.query(countQueryWithFilters, countQueryParams);
    const totalProperties = parseInt(countResult.rows[0].count);
    
    res.json({
      properties: result.rows,
      pagination: {
        total: totalProperties,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalProperties / limit)
      }
    });
  } catch (error) {
    console.error('Get all properties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get property by ID with details
const getPropertyById = async (req, res) => {
  try {
    // Get property details
    const propertyResult = await db.query(
      `SELECT p.*, u.first_name as host_first_name, u.last_name as host_last_name, u.profile_image as host_profile_image
       FROM properties p
       JOIN users u ON p.host_id = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const property = propertyResult.rows[0];

    // Get property images
    const imagesResult = await db.query(
      'SELECT * FROM property_images WHERE property_id = $1 ORDER BY is_primary DESC',
      [req.params.id]
    );

    // Get property amenities
    const amenitiesResult = await db.query(
      `SELECT a.* FROM amenities a
       JOIN property_amenities pa ON a.id = pa.amenity_id
       WHERE pa.property_id = $1`,
      [req.params.id]
    );

    // Get property reviews
    const reviewsResult = await db.query(
      `SELECT r.*, u.first_name, u.last_name, u.profile_image
       FROM reviews r
       JOIN users u ON r.guest_id = u.id
       WHERE r.property_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    // Calculate average rating
    let avgRating = 0;
    if (reviewsResult.rows.length > 0) {
      avgRating = reviewsResult.rows.reduce((sum, review) => sum + review.rating, 0) / reviewsResult.rows.length;
    }

    res.json({
      property: {
        ...property,
        images: imagesResult.rows,
        amenities: amenitiesResult.rows,
        reviews: reviewsResult.rows,
        avg_rating: avgRating,
        review_count: reviewsResult.rows.length
      }
    });
  } catch (error) {
    console.error('Get property by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new property
const createProperty = async (req, res) => {
  const {
    title,
    description,
    address,
    city,
    state,
    country,
    zip_code,
    latitude,
    longitude,
    price_per_night,
    bedrooms,
    bathrooms,
    max_guests,
    property_type,
    amenities,
    images
  } = req.body;

  const hostId = req.user.id;

  try {
    // Start a transaction
    await db.query('BEGIN');

    // Create property
    const propertyResult = await db.query(
      `INSERT INTO properties
       (host_id, title, description, address, city, state, country, zip_code, 
        latitude, longitude, price_per_night, bedrooms, bathrooms, max_guests, property_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        hostId, title, description, address, city, state, country, zip_code,
        latitude, longitude, price_per_night, bedrooms, bathrooms, max_guests, property_type
      ]
    );

    const property = propertyResult.rows[0];

    // Add property images
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await db.query(
          'INSERT INTO property_images (property_id, image_url, is_primary) VALUES ($1, $2, $3)',
          [property.id, images[i].url, i === 0] // First image is primary
        );
      }
    }

    // Add property amenities
    if (amenities && amenities.length > 0) {
      for (const amenityId of amenities) {
        await db.query(
          'INSERT INTO property_amenities (property_id, amenity_id) VALUES ($1, $2)',
          [property.id, amenityId]
        );
      }
    }

    // Commit transaction
    await db.query('COMMIT');

    res.status(201).json({
      message: 'Property created successfully',
      property
    });
  } catch (error) {
    // Rollback transaction on error
    await db.query('ROLLBACK');
    console.error('Create property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a property
const updateProperty = async (req, res) => {
  const {
    title,
    description,
    address,
    city,
    state,
    country,
    zip_code,
    latitude,
    longitude,
    price_per_night,
    bedrooms,
    bathrooms,
    max_guests,
    property_type,
    amenities,
    images
  } = req.body;

  const propertyId = req.params.id;
  const hostId = req.user.id;

  try {
    // Check if property exists and belongs to the host
    const propertyCheck = await db.query(
      'SELECT * FROM properties WHERE id = $1 AND host_id = $2',
      [propertyId, hostId]
    );

    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Property not found or you do not have permission to update it' 
      });
    }

    // Start a transaction
    await db.query('BEGIN');

    // Update property
    const propertyResult = await db.query(
      `UPDATE properties
       SET title = $1, description = $2, address = $3, city = $4, state = $5, 
           country = $6, zip_code = $7, latitude = $8, longitude = $9, 
           price_per_night = $10, bedrooms = $11, bathrooms = $12, 
           max_guests = $13, property_type = $14, updated_at = CURRENT_TIMESTAMP
       WHERE id = $15 AND host_id = $16
       RETURNING *`,
      [
        title, description, address, city, state, country, zip_code,
        latitude, longitude, price_per_night, bedrooms, bathrooms,
        max_guests, property_type, propertyId, hostId
      ]
    );

    // Update amenities if provided
    if (amenities) {
      // Remove existing amenities
      await db.query('DELETE FROM property_amenities WHERE property_id = $1', [propertyId]);
      
      // Add new amenities
      for (const amenityId of amenities) {
        await db.query(
          'INSERT INTO property_amenities (property_id, amenity_id) VALUES ($1, $2)',
          [propertyId, amenityId]
        );
      }
    }

    // Update images if provided
    if (images) {
      // Remove existing images
      await db.query('DELETE FROM property_images WHERE property_id = $1', [propertyId]);
      
      // Add new images
      for (let i = 0; i < images.length; i++) {
        await db.query(
          'INSERT INTO property_images (property_id, image_url, is_primary) VALUES ($1, $2, $3)',
          [propertyId, images[i].url, i === 0] // First image is primary
        );
      }
    }

    // Commit transaction
    await db.query('COMMIT');

    res.json({
      message: 'Property updated successfully',
      property: propertyResult.rows[0]
    });
  } catch (error) {
    // Rollback transaction on error
    await db.query('ROLLBACK');
    console.error('Update property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a property
const deleteProperty = async (req, res) => {
  const propertyId = req.params.id;
  const hostId = req.user.id;

  try {
    // Check if property exists and belongs to the host
    const propertyCheck = await db.query(
      'SELECT * FROM properties WHERE id = $1 AND host_id = $2',
      [propertyId, hostId]
    );

    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Property not found or you do not have permission to delete it' 
      });
    }

    // Delete property (cascade will delete related records)
    await db.query('DELETE FROM properties WHERE id = $1', [propertyId]);

    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get properties by host ID
const getPropertiesByHost = async (req, res) => {
  try {
    const hostId = req.params.hostId;
    
    const result = await db.query(
      `SELECT p.*, 
       (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = true LIMIT 1) as primary_image
       FROM properties p
       WHERE p.host_id = $1
       ORDER BY p.created_at DESC`,
      [hostId]
    );
    
    res.json({ properties: result.rows });
  } catch (error) {
    console.error('Get properties by host error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertiesByHost
};
