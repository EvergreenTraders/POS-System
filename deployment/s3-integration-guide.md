# S3 Integration Guide for File Uploads

Your POS System currently stores uploaded files (customer photos, IDs, jewelry images) locally. For AWS deployment, you need to store these in S3.

## What's Already Done

I've created `backend/utils/s3-upload.js` with helper functions for S3 uploads.

## How to Integrate S3 in Your Backend

### Option 1: Update Backend Server.js (Recommended)

Find your file upload routes in `backend/server.js` and update them to use S3:

#### Before (Local Storage):
```javascript
app.post('/api/customers', uploadCustomerImages, async (req, res) => {
  // Files are stored locally in 'uploads' folder
  const imagePath = req.files.image ? req.files.image[0].path : null;
  // Save imagePath to database
});
```

#### After (S3 Storage):
```javascript
const { uploadCustomerImages } = require('./utils/s3-upload');

app.post('/api/customers', uploadCustomerImagesMulter, async (req, res) => {
  try {
    // Upload to S3
    const imageUrls = await uploadCustomerImages(req.files);

    // imageUrls = {
    //   image: 'https://bucket.s3.amazonaws.com/customers/photo.jpg',
    //   id_image_front: 'https://bucket.s3.amazonaws.com/customers/ids/front.jpg',
    //   id_image_back: 'https://bucket.s3.amazonaws.com/customers/ids/back.jpg'
    // }

    // Save imageUrls to database instead of local paths
    const customer = {
      ...req.body,
      image: imageUrls.image,
      id_image_front: imageUrls.id_image_front,
      id_image_back: imageUrls.id_image_back
    };

    // Insert to database...
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Option 2: Hybrid Approach (Local Dev, S3 Production)

```javascript
const { isS3Configured, uploadCustomerImages } = require('./utils/s3-upload');

app.post('/api/customers', uploadCustomerImagesMulter, async (req, res) => {
  try {
    let imageUrls = {};

    if (isS3Configured()) {
      // Production: Use S3
      imageUrls = await uploadCustomerImages(req.files);
    } else {
      // Development: Use local storage
      imageUrls = {
        image: req.files.image ? `/uploads/${req.files.image[0].filename}` : null,
        id_image_front: req.files.id_image_front ? `/uploads/${req.files.id_image_front[0].filename}` : null,
        id_image_back: req.files.id_image_back ? `/uploads/${req.files.id_image_back[0].filename}` : null
      };
    }

    // Rest of your code...
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Available Helper Functions

### 1. Upload Single File
```javascript
const { uploadToS3 } = require('./utils/s3-upload');

const fileUrl = await uploadToS3(
  req.file.buffer,    // File buffer
  'photo.jpg',        // File name
  'image/jpeg',       // MIME type
  'customers'         // S3 folder
);
// Returns: 'https://bucket.s3.amazonaws.com/customers/photo.jpg'
```

### 2. Upload Multiple Files
```javascript
const { uploadMultipleToS3 } = require('./utils/s3-upload');

const urls = await uploadMultipleToS3(req.files, 'jewelry');
// Returns: ['url1', 'url2', 'url3']
```

### 3. Upload Customer Images (Photo + IDs)
```javascript
const { uploadCustomerImages } = require('./utils/s3-upload');

const imageUrls = await uploadCustomerImages(req.files);
// Returns: { image: 'url', id_image_front: 'url', id_image_back: 'url' }
```

### 4. Upload Jewelry Images
```javascript
const { uploadJewelryImages } = require('./utils/s3-upload');

const imageUrls = await uploadJewelryImages(req.files);
// Returns: ['url1', 'url2', 'url3']
```

### 5. Delete File
```javascript
const { deleteFromS3 } = require('./utils/s3-upload');

await deleteFromS3('https://bucket.s3.amazonaws.com/customers/photo.jpg');
// Or just the key
await deleteFromS3('customers/photo.jpg');
```

### 6. Generate Temporary URL
```javascript
const { getPresignedUrl } = require('./utils/s3-upload');

const tempUrl = await getPresignedUrl('private/file.pdf', 3600); // 1 hour
```

## Database Changes

Update your database to store full S3 URLs instead of local paths:

### Before:
```
image: '/uploads/customer-123.jpg'
```

### After:
```
image: 'https://pos-system-uploads.s3.us-east-1.amazonaws.com/customers/customer-123.jpg'
```

No schema changes needed if you're already storing strings!

## Environment Variables

Make sure these are set in Elastic Beanstalk:

```bash
AWS_REGION=us-east-1
AWS_S3_BUCKET=pos-system-uploads-yourname123

# These are automatically available on EC2/EB if using IAM roles
# AWS_ACCESS_KEY_ID=xxxxx  (optional)
# AWS_SECRET_ACCESS_KEY=xxxxx  (optional)
```

## Frontend Changes

Your frontend doesn't need changes! Just display the URLs from the database:

```jsx
<img src={customer.image} alt="Customer" />
```

The URLs work the same whether local or S3.

## Testing

### Local Testing (without S3):
```bash
# Don't set AWS_S3_BUCKET
npm run dev
# Files will be stored locally
```

### Testing with S3:
```bash
# Set environment variables
export AWS_S3_BUCKET=pos-system-uploads-test
export AWS_REGION=us-east-1
npm run dev
# Files will be uploaded to S3
```

## Security Best Practices

1. **Use IAM Roles on EC2/EB** (preferred over access keys)
2. **Make uploads bucket private** and use presigned URLs for sensitive files
3. **Set CORS** on uploads bucket:
```json
{
  "CORSRules": [{
    "AllowedOrigins": ["https://your-frontend-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"]
  }]
}
```

## Migration Script

To migrate existing local files to S3:

```javascript
// deployment/migrate-files-to-s3.js
const fs = require('fs');
const path = require('path');
const { uploadToS3 } = require('../backend/utils/s3-upload');
const { Pool } = require('pg');

async function migrateFiles() {
  const pool = new Pool({ /* RDS config */ });

  // Get all customers with local image paths
  const result = await pool.query('SELECT id, image FROM customers WHERE image LIKE \'/uploads/%\'');

  for (const customer of result.rows) {
    const localPath = path.join(__dirname, '..', customer.image);

    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const fileName = path.basename(localPath);

      // Upload to S3
      const s3Url = await uploadToS3(buffer, fileName, 'image/jpeg', 'customers');

      // Update database
      await pool.query('UPDATE customers SET image = $1 WHERE id = $2', [s3Url, customer.id]);

      console.log(`Migrated: ${customer.id}`);
    }
  }

  await pool.end();
  console.log('Migration complete!');
}

migrateFiles().catch(console.error);
```

## Common Issues

### 1. "Access Denied" Error
- Check IAM role/user has S3 permissions
- Verify bucket name is correct
- Check bucket policy allows PutObject

### 2. "Bucket does not exist"
- Create bucket: `aws s3 mb s3://bucket-name`
- Verify AWS_REGION matches bucket region

### 3. CORS Errors
- Add CORS policy to S3 bucket
- Allow your frontend domain

### 4. Images not displaying
- Check bucket ACL is public-read OR use presigned URLs
- Verify URLs in database are complete

## Next Steps

1. Install AWS SDK: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
2. Update your upload routes to use S3 helpers
3. Test locally with S3
4. Deploy to AWS
5. Migrate existing files (if any)

Need help? Check `backend/utils/s3-upload.js` for complete implementation.
