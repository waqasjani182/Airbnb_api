const db = require('../config/db');
const { uploadPropertyImage, uploadPropertyImages } = require('../utils/upload');

// Helper function to fetch related property data (images, amenities, reviews)
const fetchRelatedPropertyData = async (properties) => {
  if (!properties || properties.length === 0) {
    return [];
  }

  const propertyIds = properties.map(property => property.id);

  // Fetch all images for the properties
  const imagesResult = await db.query(
    `SELECT * FROM property_images WHERE property_id IN (${propertyIds.map((_, i) => `$${i + 1}`).join(',')}) ORDER BY is_primary DESC`,
    propertyIds
  );

  // Fetch all amenities for the properties
  const amenitiesResult = await db.query(
    `SELECT a.*, pa.property_id
     FROM amenities a
     JOIN property_amenities pa ON a.id = pa.amenity_id
     WHERE pa.property_id IN (${propertyIds.map((_, i) => `$${i + 1}`).join(',')})`,
    propertyIds
  );

  // Fetch all reviews for the properties
  const reviewsResult = await db.query(
    `SELECT r.*, u.first_name, u.last_name, u.profile_image, r.property_id
     FROM reviews r
     JOIN users u ON r.guest_id = u.id
     WHERE r.property_id IN (${propertyIds.map((_, i) => `$${i + 1}`).join(',')})
     ORDER BY r.created_at DESC`,
    propertyIds
  );

  // Group images, amenities, and reviews by property_id
  const imagesByPropertyId = {};
  const amenitiesByPropertyId = {};
  const reviewsByPropertyId = {};

  imagesResult.recordset.forEach(image => {
    if (!imagesByPropertyId[image.property_id]) {
      imagesByPropertyId[image.property_id] = [];
    }
    imagesByPropertyId[image.property_id].push(image);
  });

  amenitiesResult.recordset.forEach(amenity => {
    if (!amenitiesByPropertyId[amenity.property_id]) {
      amenitiesByPropertyId[amenity.property_id] = [];
    }
    amenitiesByPropertyId[amenity.property_id].push(amenity);
  });

  reviewsResult.recordset.forEach(review => {
    if (!reviewsByPropertyId[review.property_id]) {
      reviewsByPropertyId[review.property_id] = [];
    }
    reviewsByPropertyId[review.property_id].push(review);
  });

  // Enhance properties with related data
  const enhancedProperties = properties.map(property => {
    const propertyId = property.id;
    const images = imagesByPropertyId[propertyId] || [];
    const amenities = amenitiesByPropertyId[propertyId] || [];
    const reviews = reviewsByPropertyId[propertyId] || [];

    // Calculate average rating
    let avgRating = 0;
    if (reviews.length > 0) {
      avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    }

    return {
      ...property,
      images,
      amenities,
      reviews,
      avg_rating: property.avg_rating || avgRating,
      review_count: property.review_count || reviews.length
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
      SELECT p.*, u.first_name as host_first_name, u.last_name as host_last_name,
      (SELECT TOP 1 image_url FROM property_images WHERE property_id = p.id AND is_primary = 1) as primary_image,
      (SELECT AVG(CAST(rating AS FLOAT)) FROM reviews WHERE property_id = p.id) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE property_id = p.id) as review_count
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

    // Add pagination (SQL Server syntax)
    query += ` ORDER BY p.created_at DESC OFFSET $${paramIndex} ROWS FETCH NEXT $${paramIndex + 1} ROWS ONLY`;
    queryParams.push(offset, limit);

    // Execute query
    const result = await db.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as count FROM properties p
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
      `SELECT p.*, u.first_name as host_first_name, u.last_name as host_last_name, u.profile_image as host_profile_image
       FROM properties p
       JOIN users u ON p.host_id = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (propertyResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const property = propertyResult.recordset[0];

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
    if (reviewsResult.recordset.length > 0) {
      avgRating = reviewsResult.recordset.reduce((sum, review) => sum + review.rating, 0) / reviewsResult.recordset.length;
    }

    res.json({
      property: {
        ...property,
        images: imagesResult.recordset,
        amenities: amenitiesResult.recordset,
        reviews: reviewsResult.recordset,
        avg_rating: avgRating,
        review_count: reviewsResult.recordset.length
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
    amenities
  } = req.body;

  const hostId = req.user.id;

  try {
    // Start a transaction
    const transactionId = await db.beginTransaction();

    // Create property
    const propertyResult = await db.queryWithinTransaction(
      transactionId,
      `INSERT INTO properties
       (host_id, title, description, address, city, state, country, zip_code,
        latitude, longitude, price_per_night, bedrooms, bathrooms, max_guests, property_type)
       OUTPUT INSERTED.*
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        hostId, title, description, address, city, state, country, zip_code,
        latitude, longitude, price_per_night, bedrooms, bathrooms, max_guests, property_type
      ]
    );

    // SQL Server returns recordset instead of rows
    const property = propertyResult.recordset[0];

    // Handle uploaded image files if present
    const uploadedImages = [];
    if (req.files && req.files.property_images) {
      const imageFiles = Array.isArray(req.files.property_images)
        ? req.files.property_images
        : [req.files.property_images];

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const relativePath = `/uploads/property-images/${file.filename}`;
        const imageUrl = `${req.app.locals.BASE_URL}${relativePath}`;

        // Insert image into database
        const imageResult = await db.queryWithinTransaction(
          transactionId,
          'INSERT INTO property_images (property_id, image_url, is_primary) OUTPUT INSERTED.* VALUES ($1, $2, $3)',
          [property.id, imageUrl, i === 0] // First image is primary
        );

        uploadedImages.push(imageResult.recordset[0]);
      }
    }

    // Handle image URLs passed in request body
    if (req.body.images && req.body.images.length > 0) {
      const images = typeof req.body.images === 'string'
        ? JSON.parse(req.body.images)
        : req.body.images;

      for (let i = 0; i < images.length; i++) {
        // Determine if this should be primary (only if no files were uploaded)
        const isPrimary = uploadedImages.length === 0 && i === 0;

        await db.queryWithinTransaction(
          transactionId,
          'INSERT INTO property_images (property_id, image_url, is_primary) VALUES ($1, $2, $3)',
          [property.id, images[i].url, isPrimary]
        );

        uploadedImages.push({
          property_id: property.id,
          image_url: images[i].url,
          is_primary: isPrimary
        });
      }
    }

    // Add property amenities
    if (amenities) {
      const amenityIds = typeof amenities === 'string'
        ? JSON.parse(amenities)
        : amenities;

      if (Array.isArray(amenityIds) && amenityIds.length > 0) {
        for (const amenityId of amenityIds) {
          await db.queryWithinTransaction(
            transactionId,
            'INSERT INTO property_amenities (property_id, amenity_id) VALUES ($1, $2)',
            [property.id, amenityId]
          );
        }
      }
    }

    // Commit transaction
    await db.commitTransaction(transactionId);

    // Get amenities data
    let amenitiesData = [];
    if (amenities) {
      const amenityIds = typeof amenities === 'string'
        ? JSON.parse(amenities)
        : amenities;

      if (Array.isArray(amenityIds) && amenityIds.length > 0) {
        amenitiesData = await db.query(
          `SELECT a.* FROM amenities a WHERE a.id IN (${amenityIds.map((_, i) => `$${i + 1}`).join(',')})`,
          amenityIds
        ).then(result => result.recordset);
      }
    }

    // Add related data
    property.avg_rating = 0;  // New property has no reviews
    property.review_count = 0;
    property.images = uploadedImages;
    property.amenities = amenitiesData;
    property.reviews = [];

    res.status(201).json({
      message: 'Property created successfully',
      property
    });
  } catch (error) {
    // Rollback transaction on error
    try {
      if (error.transactionId) {
        await db.rollbackTransaction(error.transactionId);
      }
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }
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
    amenities
  } = req.body;

  const propertyId = req.params.id;
  const hostId = req.user.id;

  try {
    // Get current property data
    const currentPropertyResult = await db.query(
      'SELECT * FROM properties WHERE id = $1 AND host_id = $2',
      [propertyId, hostId]
    );

    if (currentPropertyResult.recordset.length === 0) {
      return res.status(404).json({
        message: 'Property not found or you do not have permission to update it'
      });
    }

    const currentProperty = currentPropertyResult.recordset[0];

    // Use current values for any fields not provided in the request
    const updatedTitle = title !== undefined ? title : currentProperty.title;
    const updatedDescription = description !== undefined ? description : currentProperty.description;
    const updatedAddress = address !== undefined ? address : currentProperty.address;
    const updatedCity = city !== undefined ? city : currentProperty.city;
    const updatedState = state !== undefined ? state : currentProperty.state;
    const updatedCountry = country !== undefined ? country : currentProperty.country;
    const updatedZipCode = zip_code !== undefined ? zip_code : currentProperty.zip_code;
    const updatedLatitude = latitude !== undefined ? latitude : currentProperty.latitude;
    const updatedLongitude = longitude !== undefined ? longitude : currentProperty.longitude;
    const updatedPricePerNight = price_per_night !== undefined ? price_per_night : currentProperty.price_per_night;
    const updatedBedrooms = bedrooms !== undefined ? bedrooms : currentProperty.bedrooms;
    const updatedBathrooms = bathrooms !== undefined ? bathrooms : currentProperty.bathrooms;
    const updatedMaxGuests = max_guests !== undefined ? max_guests : currentProperty.max_guests;
    const updatedPropertyType = property_type !== undefined ? property_type : currentProperty.property_type;

    // Start a transaction
    const transactionId = await db.beginTransaction();

    // Update property
    const propertyResult = await db.queryWithinTransaction(
      transactionId,
      `UPDATE properties
       SET title = $1, description = $2, address = $3, city = $4, state = $5,
           country = $6, zip_code = $7, latitude = $8, longitude = $9,
           price_per_night = $10, bedrooms = $11, bathrooms = $12,
           max_guests = $13, property_type = $14, updated_at = CURRENT_TIMESTAMP
       OUTPUT INSERTED.*
       WHERE id = $15 AND host_id = $16`,
      [
        updatedTitle, updatedDescription, updatedAddress, updatedCity, updatedState, updatedCountry, updatedZipCode,
        updatedLatitude, updatedLongitude, updatedPricePerNight, updatedBedrooms, updatedBathrooms,
        updatedMaxGuests, updatedPropertyType, propertyId, hostId
      ]
    );

    // Update amenities if provided
    if (amenities) {
      const amenityIds = typeof amenities === 'string'
        ? JSON.parse(amenities)
        : amenities;

      if (Array.isArray(amenityIds) && amenityIds.length > 0) {
        // Remove existing amenities
        await db.queryWithinTransaction(
          transactionId,
          'DELETE FROM property_amenities WHERE property_id = $1',
          [propertyId]
        );

        // Add new amenities
        for (const amenityId of amenityIds) {
          await db.queryWithinTransaction(
            transactionId,
            'INSERT INTO property_amenities (property_id, amenity_id) VALUES ($1, $2)',
            [propertyId, amenityId]
          );
        }
      }
    }

    // Handle image updates
    let shouldUpdateImages = false;

    // Check if there are uploaded files
    if (req.files && req.files.property_images) {
      shouldUpdateImages = true;
    }

    // Check if there are images in the request body
    if (req.body.images) {
      shouldUpdateImages = true;
    }

    if (shouldUpdateImages) {
      // Remove existing images
      await db.queryWithinTransaction(
        transactionId,
        'DELETE FROM property_images WHERE property_id = $1',
        [propertyId]
      );

      // Add uploaded image files if present
      if (req.files && req.files.property_images) {
        const imageFiles = Array.isArray(req.files.property_images)
          ? req.files.property_images
          : [req.files.property_images];

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const relativePath = `/uploads/property-images/${file.filename}`;
          const imageUrl = `${req.app.locals.BASE_URL}${relativePath}`;

          // Insert image into database
          await db.queryWithinTransaction(
            transactionId,
            'INSERT INTO property_images (property_id, image_url, is_primary) VALUES ($1, $2, $3)',
            [propertyId, imageUrl, i === 0] // First image is primary
          );
        }
      }

      // Add image URLs from request body if present
      if (req.body.images) {
        const images = typeof req.body.images === 'string'
          ? JSON.parse(req.body.images)
          : req.body.images;

        if (Array.isArray(images) && images.length > 0) {
          // Determine if these should be primary (only if no files were uploaded)
          const hasUploadedFiles = req.files && req.files.property_images;

          for (let i = 0; i < images.length; i++) {
            const isPrimary = !hasUploadedFiles && i === 0;

            await db.queryWithinTransaction(
              transactionId,
              'INSERT INTO property_images (property_id, image_url, is_primary) VALUES ($1, $2, $3)',
              [propertyId, images[i].url, isPrimary]
            );
          }
        }
      }
    }

    // Commit transaction
    await db.commitTransaction(transactionId);

    // Get the updated property with all related information
    const updatedProperty = propertyResult.recordset[0];

    // Get images
    const imagesResult = await db.query(
      'SELECT * FROM property_images WHERE property_id = $1 ORDER BY is_primary DESC',
      [propertyId]
    );

    // Get amenities
    const amenitiesResult = await db.query(
      `SELECT a.* FROM amenities a
       JOIN property_amenities pa ON a.id = pa.amenity_id
       WHERE pa.property_id = $1`,
      [propertyId]
    );

    // Get reviews
    const reviewsResult = await db.query(
      `SELECT r.*, u.first_name, u.last_name, u.profile_image
       FROM reviews r
       JOIN users u ON r.guest_id = u.id
       WHERE r.property_id = $1
       ORDER BY r.created_at DESC`,
      [propertyId]
    );

    // Calculate average rating
    let avgRating = 0;
    if (reviewsResult.recordset.length > 0) {
      avgRating = reviewsResult.recordset.reduce((sum, review) => sum + review.rating, 0) / reviewsResult.recordset.length;
    }

    // Add related information to the property
    updatedProperty.images = imagesResult.recordset;
    updatedProperty.amenities = amenitiesResult.recordset;
    updatedProperty.reviews = reviewsResult.recordset;
    updatedProperty.avg_rating = avgRating;
    updatedProperty.review_count = reviewsResult.recordset.length;

    res.json({
      message: 'Property updated successfully',
      property: updatedProperty
    });
  } catch (error) {
    // Rollback transaction on error
    try {
      if (error.transactionId) {
        await db.rollbackTransaction(error.transactionId);
      }
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }
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

    if (propertyCheck.recordset.length === 0) {
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
       (SELECT TOP 1 image_url FROM property_images WHERE property_id = p.id AND is_primary = 1) as primary_image,
       (SELECT AVG(CAST(rating AS FLOAT)) FROM reviews WHERE property_id = p.id) as avg_rating,
       (SELECT COUNT(*) FROM reviews WHERE property_id = p.id) as review_count
       FROM properties p
       WHERE p.host_id = $1
       ORDER BY p.created_at DESC`,
      [hostId]
    );

    // Fetch related data for properties
    const enhancedProperties = await fetchRelatedPropertyData(result.recordset);

    res.json({ properties: enhancedProperties });
  } catch (error) {
    console.error('Get properties by host error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search properties
const searchProperties = async (req, res) => {
  try {
    const {
      query,
      page = 1,
      limit = 10,
      min_price,
      max_price,
      bedrooms,
      property_type,
      city,
      state,
      country
    } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const offset = (page - 1) * limit;

    // Build the search query
    let searchQuery = `
      SELECT p.*, u.first_name as host_first_name, u.last_name as host_last_name,
      (SELECT TOP 1 image_url FROM property_images WHERE property_id = p.id AND is_primary = 1) as primary_image,
      (SELECT AVG(CAST(rating AS FLOAT)) FROM reviews WHERE property_id = p.id) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE property_id = p.id) as review_count
      FROM properties p
      JOIN users u ON p.host_id = u.id
      WHERE (
        LOWER(p.title) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.description) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.address) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.city) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.state) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.country) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.zip_code) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.property_type) LIKE '%' + LOWER($1) + '%'
      )
    `;

    const queryParams = [query];
    let paramIndex = 2;

    // Add filters
    if (city) {
      searchQuery += ` AND LOWER(p.city) = LOWER($${paramIndex})`;
      queryParams.push(city);
      paramIndex++;
    }

    if (state) {
      searchQuery += ` AND LOWER(p.state) = LOWER($${paramIndex})`;
      queryParams.push(state);
      paramIndex++;
    }

    if (country) {
      searchQuery += ` AND LOWER(p.country) = LOWER($${paramIndex})`;
      queryParams.push(country);
      paramIndex++;
    }

    if (min_price) {
      searchQuery += ` AND p.price_per_night >= $${paramIndex}`;
      queryParams.push(min_price);
      paramIndex++;
    }

    if (max_price) {
      searchQuery += ` AND p.price_per_night <= $${paramIndex}`;
      queryParams.push(max_price);
      paramIndex++;
    }

    if (bedrooms) {
      searchQuery += ` AND p.bedrooms >= $${paramIndex}`;
      queryParams.push(bedrooms);
      paramIndex++;
    }

    if (property_type) {
      searchQuery += ` AND LOWER(p.property_type) = LOWER($${paramIndex})`;
      queryParams.push(property_type);
      paramIndex++;
    }

    // Add pagination
    searchQuery += ` ORDER BY p.created_at DESC OFFSET $${paramIndex} ROWS FETCH NEXT $${paramIndex + 1} ROWS ONLY`;
    queryParams.push(offset, limit);

    // Execute query
    const result = await db.query(searchQuery, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as count FROM properties p
      WHERE (
        LOWER(p.title) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.description) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.address) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.city) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.state) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.country) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.zip_code) LIKE '%' + LOWER($1) + '%' OR
        LOWER(p.property_type) LIKE '%' + LOWER($1) + '%'
      )
    `;

    // Apply the same filters to count query
    let countQueryParams = [query];
    let countParamIndex = 2;

    if (city) {
      countQuery += ` AND LOWER(p.city) = LOWER($${countParamIndex})`;
      countQueryParams.push(city);
      countParamIndex++;
    }

    if (state) {
      countQuery += ` AND LOWER(p.state) = LOWER($${countParamIndex})`;
      countQueryParams.push(state);
      countParamIndex++;
    }

    if (country) {
      countQuery += ` AND LOWER(p.country) = LOWER($${countParamIndex})`;
      countQueryParams.push(country);
      countParamIndex++;
    }

    if (min_price) {
      countQuery += ` AND p.price_per_night >= $${countParamIndex}`;
      countQueryParams.push(min_price);
      countParamIndex++;
    }

    if (max_price) {
      countQuery += ` AND p.price_per_night <= $${countParamIndex}`;
      countQueryParams.push(max_price);
      countParamIndex++;
    }

    if (bedrooms) {
      countQuery += ` AND p.bedrooms >= $${countParamIndex}`;
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
    console.error('Search properties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload a single property image
const uploadSinglePropertyImage = (req, res) => {
  uploadPropertyImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        message: 'Error uploading property image',
        error: err.message
      });
    }

    // If no file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const propertyId = req.params.id;
      const hostId = req.user.id;

      // Check if property exists and belongs to the host
      const propertyResult = await db.query(
        'SELECT * FROM properties WHERE id = $1 AND host_id = $2',
        [propertyId, hostId]
      );

      if (propertyResult.recordset.length === 0) {
        return res.status(404).json({
          message: 'Property not found or you do not have permission to update it'
        });
      }

      const relativePath = `/uploads/property-images/${req.file.filename}`;
      const imageUrl = `${req.app.locals.BASE_URL}${relativePath}`;
      const isPrimary = req.body.is_primary === 'true';

      // If this image is set as primary, update all other images to non-primary
      if (isPrimary) {
        await db.query(
          'UPDATE property_images SET is_primary = 0 WHERE property_id = $1',
          [propertyId]
        );
      }

      // Insert the new image
      const result = await db.query(
        'INSERT INTO property_images (property_id, image_url, is_primary) OUTPUT INSERTED.* VALUES ($1, $2, $3)',
        [propertyId, imageUrl, isPrimary]
      );

      // Get all property images
      const imagesResult = await db.query(
        'SELECT * FROM property_images WHERE property_id = $1 ORDER BY is_primary DESC',
        [propertyId]
      );

      res.json({
        message: 'Property image uploaded successfully',
        image: result.recordset[0],
        images: imagesResult.recordset
      });
    } catch (error) {
      console.error('Upload property image error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
};

// Upload multiple property images
const uploadMultiplePropertyImages = (req, res) => {
  uploadPropertyImages(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        message: 'Error uploading property images',
        error: err.message
      });
    }

    // If no files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    try {
      const propertyId = req.params.id;
      const hostId = req.user.id;

      // Check if property exists and belongs to the host
      const propertyResult = await db.query(
        'SELECT * FROM properties WHERE id = $1 AND host_id = $2',
        [propertyId, hostId]
      );

      if (propertyResult.recordset.length === 0) {
        return res.status(404).json({
          message: 'Property not found or you do not have permission to update it'
        });
      }

      // Start a transaction
      const transactionId = await db.beginTransaction();

      // If setPrimary is true, update all existing images to non-primary
      if (req.body.set_primary === 'true') {
        await db.queryWithinTransaction(
          transactionId,
          'UPDATE property_images SET is_primary = 0 WHERE property_id = $1',
          [propertyId]
        );
      }

      // Insert all uploaded images
      const uploadedImages = [];
      for (let i = 0; i < req.files.length; i++) {
        const relativePath = `/uploads/property-images/${req.files[i].filename}`;
        const imageUrl = `${req.app.locals.BASE_URL}${relativePath}`;
        // First image is primary if setPrimary is true
        const isPrimary = req.body.set_primary === 'true' && i === 0;

        const result = await db.queryWithinTransaction(
          transactionId,
          'INSERT INTO property_images (property_id, image_url, is_primary) OUTPUT INSERTED.* VALUES ($1, $2, $3)',
          [propertyId, imageUrl, isPrimary]
        );

        uploadedImages.push(result.recordset[0]);
      }

      // Commit transaction
      await db.commitTransaction(transactionId);

      // Get all property images
      const imagesResult = await db.query(
        'SELECT * FROM property_images WHERE property_id = $1 ORDER BY is_primary DESC',
        [propertyId]
      );

      res.json({
        message: 'Property images uploaded successfully',
        uploaded_images: uploadedImages,
        all_images: imagesResult.recordset
      });
    } catch (error) {
      // Rollback transaction on error
      try {
        if (error.transactionId) {
          await db.rollbackTransaction(error.transactionId);
        }
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
      console.error('Upload property images error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
};

module.exports = {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertiesByHost,
  searchProperties,
  uploadSinglePropertyImage,
  uploadMultiplePropertyImages
};
