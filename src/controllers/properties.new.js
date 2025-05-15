const db = require('../config/db');
const { uploadPropertyImage, uploadPropertyImages } = require('../utils/upload');

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

// Export the functions
module.exports = {
  getAllProperties,
  getPropertyById
};
