// AWS S3 Upload Utility
// This replaces local file storage with S3 for production deployment

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined // Use IAM role if running on EC2/EB
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'pos-system-uploads';

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} fileName - Desired file name
 * @param {string} mimetype - File MIME type
 * @param {string} folder - S3 folder/prefix (e.g., 'customers', 'jewelry')
 * @returns {Promise<string>} - S3 file URL
 */
async function uploadToS3(fileBuffer, fileName, mimetype, folder = '') {
  try {
    const key = folder ? `${folder}/${fileName}` : fileName;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimetype,
      ACL: 'public-read', // Make files publicly accessible
    });

    await s3Client.send(command);

    // Return the public URL
    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    return fileUrl;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
}

/**
 * Upload multiple files to S3
 * @param {Array} files - Array of file objects from multer
 * @param {string} folder - S3 folder/prefix
 * @returns {Promise<Array>} - Array of S3 file URLs
 */
async function uploadMultipleToS3(files, folder = '') {
  try {
    const uploadPromises = files.map(file => {
      const fileName = `${Date.now()}-${file.originalname}`;
      return uploadToS3(file.buffer, fileName, file.mimetype, folder);
    });

    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error('S3 Multiple Upload Error:', error);
    throw error;
  }
}

/**
 * Delete file from S3
 * @param {string} fileUrl - Full S3 URL or just the key
 * @returns {Promise<boolean>} - Success status
 */
async function deleteFromS3(fileUrl) {
  try {
    // Extract key from URL if full URL is provided
    let key = fileUrl;
    if (fileUrl.includes('amazonaws.com/')) {
      key = fileUrl.split('amazonaws.com/')[1];
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
}

/**
 * Generate presigned URL for temporary access
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns {Promise<string>} - Presigned URL
 */
async function getPresignedUrl(key, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('S3 Presigned URL Error:', error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
}

/**
 * Upload customer images (photo, ID front, ID back)
 * @param {Object} files - Files object from multer.fields()
 * @returns {Promise<Object>} - Object with image URLs
 */
async function uploadCustomerImages(files) {
  const imageUrls = {};

  try {
    if (files.image && files.image[0]) {
      const fileName = `customer-photo-${Date.now()}.${files.image[0].mimetype.split('/')[1]}`;
      imageUrls.image = await uploadToS3(files.image[0].buffer, fileName, files.image[0].mimetype, 'customers');
    }

    if (files.id_image_front && files.id_image_front[0]) {
      const fileName = `id-front-${Date.now()}.${files.id_image_front[0].mimetype.split('/')[1]}`;
      imageUrls.id_image_front = await uploadToS3(files.id_image_front[0].buffer, fileName, files.id_image_front[0].mimetype, 'customers/ids');
    }

    if (files.id_image_back && files.id_image_back[0]) {
      const fileName = `id-back-${Date.now()}.${files.id_image_back[0].mimetype.split('/')[1]}`;
      imageUrls.id_image_back = await uploadToS3(files.id_image_back[0].buffer, fileName, files.id_image_back[0].mimetype, 'customers/ids');
    }

    return imageUrls;
  } catch (error) {
    console.error('Customer Images Upload Error:', error);
    throw error;
  }
}

/**
 * Upload jewelry images
 * @param {Array} files - Array of image files from multer
 * @returns {Promise<Array>} - Array of image URLs
 */
async function uploadJewelryImages(files) {
  try {
    const imageUrls = await uploadMultipleToS3(files, 'jewelry');
    return imageUrls;
  } catch (error) {
    console.error('Jewelry Images Upload Error:', error);
    throw error;
  }
}

/**
 * Check if S3 is configured and available
 * @returns {boolean} - True if S3 is configured
 */
function isS3Configured() {
  return !!(process.env.AWS_S3_BUCKET && (
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_REGION // Running on AWS with IAM role
  ));
}

module.exports = {
  uploadToS3,
  uploadMultipleToS3,
  deleteFromS3,
  getPresignedUrl,
  uploadCustomerImages,
  uploadJewelryImages,
  isS3Configured,
  s3Client,
  BUCKET_NAME
};
