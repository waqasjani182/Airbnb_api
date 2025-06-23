const db = require('../config/db');

// Helper function to fetch related property data
const fetchRelatedPropertyData = async (properties) => {
  if (!properties || properties.length === 0) {
    return [];
  }

  // Extract property IDs
  const propertyIds = properties.map(p => p.property_id);

  // Fetch images for all properties
  const imagesResult = await db.query(
    `SELECT * FROM Pictures WHERE property_id IN (${propertyIds.map((_, i) => `$${i + 1}`).join(',')})`,
    propertyIds
  );

  // Fetch facilities (amenities) for all properties
  const facilitiesResult = await db.query(
    `SELECT f.*, pf.property_id 
     FROM Facilities f
     JOIN Property_Facilities pf ON f.facility_id = pf.facility_id
     WHERE pf.property_id IN (${propertyIds.map((_, i) => `$${i + 1}`).join(',')})`,
    propertyIds
  );

  // Fetch reviews for all properties
  const reviewsResult = await db.query(
    `SELECT br.*, u.name, br.property_id
     FROM Booking_Review br
     JOIN Users u ON br.user_ID = u.user_ID
     WHERE br.property_id IN (${propertyIds.map((_, i) => `$${i + 1}`).join(',')})`,
    propertyIds
  );

  // Group images, facilities, and reviews by property_id
  const imagesByPropertyId = {};
  const facilitiesByPropertyId = {};
  const reviewsByPropertyId = {};

  imagesResult.recordset.forEach(image => {
    if (!imagesByPropertyId[image.property_id]) {
      imagesByPropertyId[image.property_id] = [];
    }
    imagesByPropertyId[image.property_id].push(image);
  });

  facilitiesResult.recordset.forEach(facility => {
    if (!facilitiesByPropertyId[facility.property_id]) {
      facilitiesByPropertyId[facility.property_id] = [];
    }
    facilitiesByPropertyId[facility.property_id].push(facility);
  });

  reviewsResult.recordset.forEach(review => {
    if (!reviewsByPropertyId[review.property_id]) {
      reviewsByPropertyId[review.property_id] = [];
    }
    reviewsByPropertyId[review.property_id].push(review);
  });

  // Enhance properties with related data
  const enhancedProperties = properties.map(property => {
    const propertyId = property.property_id;
    const images = imagesByPropertyId[propertyId] || [];
    const facilities = facilitiesByPropertyId[propertyId] || [];
    const reviews = reviewsByPropertyId[propertyId] || [];

    // Calculate average rating
    let avgRating = 0;
    if (reviews.length > 0) {
      avgRating = reviews.reduce((sum, review) => sum + review.property_rating, 0) / reviews.length;
    }

    return {
      ...property,
      images,
      facilities,
      reviews,
      avg_rating: property.rating || avgRating,
      review_count: reviews.length
    };
  });

  return enhancedProperties;
};

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
      SELECT p.*, u.name as host_name
      FROM Properties p
      JOIN Users u ON p.user_id = u.user_ID
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
      query += ` AND p.rent_per_day >= $${paramIndex}`;
      queryParams.push(min_price);
      paramIndex++;
    }

    if (max_price) {
      query += ` AND p.rent_per_day <= $${paramIndex}`;
      queryParams.push(max_price);
      paramIndex++;
    }

    if (bedrooms) {
      // Check if property is a house
      query += ` AND EXISTS (SELECT 1 FROM House h WHERE h.property_id = p.property_id AND h.total_bedrooms >= $${paramIndex})`;
      queryParams.push(bedrooms);
      paramIndex++;
    }

    if (property_type) {
      query += ` AND LOWER(p.property_type) = LOWER($${paramIndex})`;
      queryParams.push(property_type);
      paramIndex++;
    }

    // Add pagination
    query += ` ORDER BY p.property_id OFFSET $${paramIndex} ROWS FETCH NEXT $${paramIndex + 1} ROWS ONLY`;
    queryParams.push(offset, parseInt(limit));

    const result = await db.query(query, queryParams);

    // Build count query with the same filters
    let countQuery = `
      SELECT COUNT(*) as count
      FROM Properties p
      WHERE 1=1
    `;

    const countQueryParams = [];
    let countParamIndex = 1;

    if (city) {
      countQuery += ` AND LOWER(p.city) = LOWER($${countParamIndex})`;
      countQueryParams.push(city);
      countParamIndex++;
    }

    if (min_price) {
      countQuery += ` AND p.rent_per_day >= $${countParamIndex}`;
      countQueryParams.push(min_price);
      countParamIndex++;
    }

    if (max_price) {
      countQuery += ` AND p.rent_per_day <= $${countParamIndex}`;
      countQueryParams.push(max_price);
      countParamIndex++;
    }

    if (bedrooms) {
      // Check if property is a house
      countQuery += ` AND EXISTS (SELECT 1 FROM House h WHERE h.property_id = p.property_id AND h.total_bedrooms >= $${countParamIndex})`;
      countQueryParams.push(bedrooms);
      countParamIndex++;
    }

    if (property_type) {
      countQuery += ` AND LOWER(p.property_type) = LOWER($${countParamIndex})`;
      countQueryParams.push(property_type);
      countParamIndex++;
    }

    const countResult = await db.query(countQuery, countQueryParams);
    const totalProperties = parseInt(countResult.recordset[0].count);

    // Fetch related data for properties
    const enhancedProperties = await fetchRelatedPropertyData(result.recordset);

    res.json({
      properties: enhancedProperties,
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
      `SELECT p.*, u.name as host_name
       FROM Properties p
       JOIN Users u ON p.user_id = u.user_ID
       WHERE p.property_id = $1`,
      [req.params.id]
    );

    if (propertyResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const property = propertyResult.recordset[0];

    // Get property images
    const imagesResult = await db.query(
      'SELECT * FROM Pictures WHERE property_id = $1',
      [req.params.id]
    );

    // Get property facilities
    const facilitiesResult = await db.query(
      `SELECT f.* FROM Facilities f
       JOIN Property_Facilities pf ON f.facility_id = pf.facility_id
       WHERE pf.property_id = $1`,
      [req.params.id]
    );

    // Get property reviews
    const reviewsResult = await db.query(
      `SELECT br.*, u.name
       FROM Booking_Review br
       JOIN Users u ON br.user_ID = u.user_ID
       WHERE br.property_id = $1`,
      [req.params.id]
    );

    // Calculate average rating
    let avgRating = 0;
    if (reviewsResult.recordset.length > 0) {
      avgRating = reviewsResult.recordset.reduce((sum, review) => sum + review.property_rating, 0) / reviewsResult.recordset.length;
    }

    res.json({
      property: {
        ...property,
        images: imagesResult.recordset,
        facilities: facilitiesResult.recordset,
        reviews: reviewsResult.recordset,
        avg_rating: property.rating || avgRating,
        review_count: reviewsResult.recordset.length
      }
    });
  } catch (error) {
    console.error('Get property by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search properties
const searchProperties = async (req, res) => {
  try {
    const { q, city, min_price, max_price, property_type } = req.query;

    let query = `
      SELECT p.*, u.name as host_name
      FROM Properties p
      JOIN Users u ON p.user_id = u.user_ID
      WHERE 1=1
    `;

    const queryParams = [];
    let paramIndex = 1;

    if (q) {
      query += ` AND (LOWER(p.title) LIKE LOWER($${paramIndex}) OR LOWER(p.description) LIKE LOWER($${paramIndex + 1}))`;
      queryParams.push(`%${q}%`, `%${q}%`);
      paramIndex += 2;
    }

    if (city) {
      query += ` AND LOWER(p.city) = LOWER($${paramIndex})`;
      queryParams.push(city);
      paramIndex++;
    }

    if (min_price) {
      query += ` AND p.rent_per_day >= $${paramIndex}`;
      queryParams.push(min_price);
      paramIndex++;
    }

    if (max_price) {
      query += ` AND p.rent_per_day <= $${paramIndex}`;
      queryParams.push(max_price);
      paramIndex++;
    }

    if (property_type) {
      query += ` AND LOWER(p.property_type) = LOWER($${paramIndex})`;
      queryParams.push(property_type);
      paramIndex++;
    }

    query += ` ORDER BY p.property_id`;

    const result = await db.query(query, queryParams);
    const enhancedProperties = await fetchRelatedPropertyData(result.recordset);

    res.json({ properties: enhancedProperties });
  } catch (error) {
    console.error('Search properties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get properties by host ID
const getPropertiesByHost = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.name as host_name
       FROM Properties p
       JOIN Users u ON p.user_id = u.user_ID
       WHERE p.user_id = $1
       ORDER BY p.property_id DESC`,
      [req.params.hostId]
    );

    const enhancedProperties = await fetchRelatedPropertyData(result.recordset);
    res.json({ properties: enhancedProperties });
  } catch (error) {
    console.error('Get properties by host error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new property
const createProperty = async (req, res) => {
  try {

    const userId = req.user.user_ID;
    const {
      title,
      description,
      address,
      city,
      latitude,
      longitude,
      rent_per_day,
      property_type,
      guest,
      total_bedrooms,
      total_rooms,
      total_beds,
      facilities = []
    } = req.body;

    // Handle facilities - it might come as a string, array, or multiple form fields
    let facilitiesArray = [];
    if (facilities) {


      if (typeof facilities === 'string') {
        // Handle different string formats
        if (facilities.startsWith('[') && facilities.endsWith(']')) {
          try {
            facilitiesArray = JSON.parse(facilities);
          } catch (e) {

            facilitiesArray = [];
          }
        } else {
          // Single facility ID as string
          const id = parseInt(facilities);
          if (!isNaN(id)) {
            facilitiesArray = [id];
          }
        }
      } else if (Array.isArray(facilities)) {
        // Multiple form fields or JSON array
        facilitiesArray = facilities.map(id => parseInt(id)).filter(id => !isNaN(id));
      }

    }

    // Get the next available property_id
    const maxIdResult = await db.query('SELECT MAX(property_id) as max_id FROM Properties');
    const nextPropertyId = (maxIdResult.recordset[0].max_id || 0) + 1;

    // Insert property (matching the actual database schema)
    const propertyResult = await db.query(
      `INSERT INTO Properties (property_id, user_id, title, description, address, city, latitude, longitude, rent_per_day, property_type, guest)
       OUTPUT INSERTED.property_id
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [nextPropertyId, userId, title, description, address, city, latitude, longitude, rent_per_day, property_type, guest]
    );

    const propertyId = propertyResult.recordset[0].property_id;

    // Handle property type specific tables
    if (property_type && property_type.toLowerCase() === 'house' && total_bedrooms) {
      await db.query(
        'INSERT INTO House (property_id, total_bedrooms) VALUES ($1, $2)',
        [propertyId, total_bedrooms]
      );
    } else if (property_type && property_type.toLowerCase() === 'flat' && total_rooms) {
      await db.query(
        'INSERT INTO Flat (property_id, total_rooms) VALUES ($1, $2)',
        [propertyId, total_rooms]
      );
    } else if (property_type && property_type.toLowerCase() === 'room' && total_beds) {
      await db.query(
        'INSERT INTO Room (property_id, total_beds) VALUES ($1, $2)',
        [propertyId, total_beds]
      );
    }

    // Handle image uploads
    try {
      if (req.files && req.files.property_images && req.files.property_images.length > 0) {
        const baseUrl = req.app.locals.BASE_URL || 'http://localhost:3004';
        for (const file of req.files.property_images) {
          const imageUrl = `${baseUrl}/uploads/property-images/${file.filename}`;

          await db.query(
            'INSERT INTO Pictures (property_id, image_url) VALUES ($1, $2)',
            [propertyId, imageUrl]
          );
        }
      }
    } catch (imageError) {
      console.error('Error handling image uploads:', imageError);
      // Don't fail the entire property creation if image upload fails
      // Just log the error and continue
    }

    // Handle facilities
    if (facilitiesArray.length > 0) {
      for (const facilityId of facilitiesArray) {
        await db.query(
          'INSERT INTO Property_Facilities (property_id, facility_id) VALUES ($1, $2)',
          [propertyId, facilityId]
        );
      }
    }


    res.status(201).json({
      message: 'Property created successfully',
      property_id: propertyId
    });
  } catch (error) {
    console.error('Create property error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update property
const updateProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const userId = req.user.user_ID;
    const {
      title,
      description,
      address,
      city,
      latitude,
      longitude,
      rent_per_day,
      property_type,
      guest,
      total_bedrooms,
      total_rooms,
      total_beds,
      facilities = []
    } = req.body;

    // Handle facilities - it might come as a string, array, or multiple form fields
    let facilitiesArray = [];
    if (facilities) {


      if (typeof facilities === 'string') {
        // Handle different string formats
        if (facilities.startsWith('[') && facilities.endsWith(']')) {
          try {
            facilitiesArray = JSON.parse(facilities);
          } catch (e) {

            facilitiesArray = [];
          }
        } else {
          // Single facility ID as string
          const id = parseInt(facilities);
          if (!isNaN(id)) {
            facilitiesArray = [id];
          }
        }
      } else if (Array.isArray(facilities)) {
        // Multiple form fields or JSON array
        facilitiesArray = facilities.map(id => parseInt(id)).filter(id => !isNaN(id));
      }

    }

    // Check if property belongs to user
    const propertyCheck = await db.query(
      'SELECT user_id FROM Properties WHERE property_id = $1',
      [propertyId]
    );

    if (propertyCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (propertyCheck.recordset[0].user_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this property' });
    }

    // Update property
    await db.query(
      `UPDATE Properties
       SET title = $1, description = $2, address = $3, city = $4,
           latitude = $5, longitude = $6, rent_per_day = $7, property_type = $8, guest = $9
       WHERE property_id = $10`,
      [title, description, address, city, latitude, longitude, rent_per_day, property_type, guest, propertyId]
    );

    // Update property type specific tables
    if (property_type && property_type.toLowerCase() === 'house' && total_bedrooms) {
      await db.query('DELETE FROM House WHERE property_id = $1', [propertyId]);
      await db.query(
        'INSERT INTO House (property_id, total_bedrooms) VALUES ($1, $2)',
        [propertyId, total_bedrooms]
      );
    } else if (property_type && property_type.toLowerCase() === 'flat' && total_rooms) {
      await db.query('DELETE FROM Flat WHERE property_id = $1', [propertyId]);
      await db.query(
        'INSERT INTO Flat (property_id, total_rooms) VALUES ($1, $2)',
        [propertyId, total_rooms]
      );
    } else if (property_type && property_type.toLowerCase() === 'room' && total_beds) {
      await db.query('DELETE FROM Room WHERE property_id = $1', [propertyId]);
      await db.query(
        'INSERT INTO Room (property_id, total_beds) VALUES ($1, $2)',
        [propertyId, total_beds]
      );
    }

    // Handle new image uploads
    if (req.files && req.files.property_images) {
      const baseUrl = req.app.locals.BASE_URL;
      for (const file of req.files.property_images) {
        const imageUrl = `${baseUrl}/uploads/property-images/${file.filename}`;
        await db.query(
          'INSERT INTO Pictures (property_id, image_url) VALUES ($1, $2)',
          [propertyId, imageUrl]
        );
      }
    }

    // Update facilities
    await db.query('DELETE FROM Property_Facilities WHERE property_id = $1', [propertyId]);
    if (facilitiesArray.length > 0) {
      for (const facilityId of facilitiesArray) {
        await db.query(
          'INSERT INTO Property_Facilities (property_id, facility_id) VALUES ($1, $2)',
          [propertyId, facilityId]
        );
      }
    }

    res.json({ message: 'Property updated successfully' });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete property
const deleteProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const userId = req.user.user_ID;

    // Check if property belongs to user
    const propertyCheck = await db.query(
      'SELECT user_id FROM Properties WHERE property_id = $1',
      [propertyId]
    );

    if (propertyCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (propertyCheck.recordset[0].user_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this property' });
    }

    // Delete property (cascading deletes will handle related records)
    await db.query('DELETE FROM Properties WHERE property_id = $1', [propertyId]);

    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};





// Export the functions
module.exports = {
  getAllProperties,
  getPropertyById,
  searchProperties,
  getPropertiesByHost,
  createProperty,
  updateProperty,
  deleteProperty
};
