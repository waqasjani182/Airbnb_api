const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const profileImagesDir = path.join(__dirname, '../../public/uploads/profile-images');
const propertyImagesDir = path.join(__dirname, '../../public/uploads/property-images');

// Create directories if they don't exist
[profileImagesDir, propertyImagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for profile images
const profileImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profileImagesDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

// File filter to only allow image files
const imageFileFilter = (req, file, cb) => {
  // Accept only image files
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

// Configure storage for property images
const propertyImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, propertyImagesDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'property-' + uniqueSuffix + ext);
  }
});

// Create multer upload instance for profile images
const uploadProfileImage = multer({
  storage: profileImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: imageFileFilter
}).single('profile_image');

// Create multer upload instance for property images
const uploadPropertyImage = multer({
  storage: propertyImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: imageFileFilter
}).single('property_image');

// Create multer upload instance for multiple property images
const uploadPropertyImages = multer({
  storage: propertyImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: imageFileFilter
}).fields([
  { name: 'property_images', maxCount: 10 },
  { name: 'images', maxCount: 0 } // For JSON data
]);

module.exports = {
  uploadProfileImage,
  uploadPropertyImage,
  uploadPropertyImages
};
