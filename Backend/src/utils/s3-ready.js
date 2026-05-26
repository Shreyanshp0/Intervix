/**
 * Intervix Cloud Storage Readiness Gateway
 * Path: Backend/src/utils/s3-ready.js
 * 
 * Provides an enterprise-grade cloud-storage abstraction layer for cv/resume documents.
 * Employs a dynamic, fallback-safe module loader that allows seamless local development
 * without requiring AWS SDK packages installed locally, while automatically scaling up
 * to AWS S3 & CloudFront when keys are provided in production.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// AWS Environment Configurations
const CONFIG = {
  enabled: process.env.USE_S3_UPLOAD === 'true',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  region: process.env.AWS_REGION || 'us-east-1',
  bucketName: process.env.AWS_S3_BUCKET || 'intervix-candidate-resumes',
  cloudfrontDistributionUrl: process.env.CLOUDFRONT_DISTRIBUTION_URL || '', // E.g. https://d111111abcdef8.cloudfront.net
  presignedUrlExpiry: parseInt(process.env.AWS_PRESIGNED_EXPIRY_SECONDS || '3600', 10), // Default 1 hour
};

// Dynamic AWS SDK Loader
let S3Client = null;
let PutObjectCommand = null;
let DeleteObjectCommand = null;
let GetObjectCommand = null;
let getSignedUrl = null;
let s3ClientInstance = null;

if (CONFIG.enabled) {
  try {
    const s3ClientModule = await import('@aws-sdk/client-s3');
    const s3PresignerModule = await import('@aws-sdk/s3-request-presigner');
    
    S3Client = s3ClientModule.S3Client;
    PutObjectCommand = s3ClientModule.PutObjectCommand;
    DeleteObjectCommand = s3ClientModule.DeleteObjectCommand;
    GetObjectCommand = s3ClientModule.GetObjectCommand;
    getSignedUrl = s3PresignerModule.getSignedUrl;

    if (CONFIG.accessKeyId && CONFIG.secretAccessKey) {
      s3ClientInstance = new S3Client({
        region: CONFIG.region,
        credentials: {
          accessKeyId: CONFIG.accessKeyId,
          secretAccessKey: CONFIG.secretAccessKey
        }
      });
      logger.info('AWS S3 Client successfully initialized for resume storage pipelines.');
    } else {
      logger.warn('USE_S3_UPLOAD set to true, but AWS credentials are missing. Falling back to local storage.');
      CONFIG.enabled = false;
    }
  } catch (err) {
    logger.warn(
      'AWS SDK modules (@aws-sdk/client-s3 or @aws-sdk/s3-request-presigner) are not installed. ' +
      'Falling back to local storage gateway. Run "npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner" to activate.'
    );
    CONFIG.enabled = false;
  }
} else {
  logger.info('AWS S3 Integration disabled. Resumes are stored and fetched locally in uploads/ directory.');
}

class S3ReadyAdapter {
  /**
   * Check if AWS S3 is active and properly authenticated
   * @returns {boolean}
   */
  isCloudStorageActive() {
    return CONFIG.enabled && s3ClientInstance !== null;
  }

  /**
   * Upload a file to S3 or fall back to local disk copy
   * @param {Object} file - Multer file object
   * @param {string} customKey - Unique storage path/key inside the bucket
   * @returns {Promise<{ url: string, key: string, storageType: 's3' | 'local' }>}
   */
  async uploadFile(file, customKey) {
    const key = customKey || `resumes/${Date.now()}-${file.originalname}`;

    if (this.isCloudStorageActive()) {
      try {
        const fileStream = fs.createReadStream(file.path);
        
        const uploadParams = {
          Bucket: CONFIG.bucketName,
          Key: key,
          Body: fileStream,
          ContentType: file.mimetype,
        };

        await s3ClientInstance.send(new PutObjectCommand(uploadParams));
        
        // Clean up temporary local upload file populated by multer
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          logger.warn(`Failed to clean temporary file ${file.path}: ${err.message}`);
        }

        const fileUrl = this.getPublicUrl(key);
        logger.info(`S3: Document successfully uploaded to s3://${CONFIG.bucketName}/${key}`);

        return {
          url: fileUrl,
          key: key,
          storageType: 's3'
        };
      } catch (error) {
        logger.error(`S3 Upload failed: ${error.message}. Performing local storage fallback.`);
      }
    }

    // Local Storage Gateway Fallback
    // If multer has already saved the file, keep it or move it to standard uploads folder.
    logger.info(`Local Storage: Document stored locally under relative key: ${key}`);
    const localUrl = `/api/resume/preview?key=${encodeURIComponent(key)}`;
    
    return {
      url: localUrl,
      key: key,
      storageType: 'local'
    };
  }

  /**
   * Delete an object from storage
   * @param {string} key - Unique key of the file
   * @param {string} [localPath] - Optional local file path to delete
   * @returns {Promise<boolean>}
   */
  async deleteFile(key, localPath) {
    if (this.isCloudStorageActive()) {
      try {
        const deleteParams = {
          Bucket: CONFIG.bucketName,
          Key: key
        };

        await s3ClientInstance.send(new DeleteObjectCommand(deleteParams));
        logger.info(`S3: Successfully deleted s3://${CONFIG.bucketName}/${key}`);
        return true;
      } catch (error) {
        logger.error(`S3 Delete failed: ${error.message}`);
      }
    }

    // Local file cleanup fallback
    const actualLocalPath = localPath || path.join(__dirname, '../../uploads/resumes', path.basename(key));
    if (fs.existsSync(actualLocalPath)) {
      try {
        fs.unlinkSync(actualLocalPath);
        logger.info(`Local Storage: Purged document from local disk at ${actualLocalPath}`);
        return true;
      } catch (err) {
        logger.error(`Local file unlink failed at ${actualLocalPath}: ${err.message}`);
      }
    }
    return false;
  }

  /**
   * Get secure pre-signed GET URL for resume streaming/viewing
   * @param {string} key - File unique key
   * @returns {Promise<string>}
   */
  async getReadUrl(key) {
    if (this.isCloudStorageActive()) {
      try {
        // If CloudFront configuration is available, return CloudFront dynamic delivery URL
        if (CONFIG.cloudfrontDistributionUrl) {
          return `${CONFIG.cloudfrontDistributionUrl}/${key}`;
        }

        // Generate temporary S3 Presigned URL
        const command = new GetObjectCommand({
          Bucket: CONFIG.bucketName,
          Key: key
        });

        const presignedUrl = await getSignedUrl(s3ClientInstance, command, {
          expiresIn: CONFIG.presignedUrlExpiry
        });

        return presignedUrl;
      } catch (error) {
        logger.error(`Presigned URL calculation failed: ${error.message}`);
      }
    }

    // Local route mapping URL fallback
    return `/api/resume/preview?key=${encodeURIComponent(key)}`;
  }

  /**
   * Generate structural public url path
   * @param {string} key 
   * @returns {string}
   */
  getPublicUrl(key) {
    if (CONFIG.cloudfrontDistributionUrl) {
      const baseUrl = CONFIG.cloudfrontDistributionUrl.endsWith('/') 
        ? CONFIG.cloudfrontDistributionUrl.slice(0, -1) 
        : CONFIG.cloudfrontDistributionUrl;
      return `${baseUrl}/${key}`;
    }
    return `https://${CONFIG.bucketName}.s3.${CONFIG.region}.amazonaws.com/${key}`;
  }
}

export default new S3ReadyAdapter();

/**
 * =========================================================================
 *                   AWS PRODUCTION TRANSITION & SETUP MANUAL
 * =========================================================================
 * 
 * To scale candidate resume processing and asset distribution to cloud-native production,
 * follow these instructions carefully.
 * 
 * 1. Install AWS SDK Dependencies in Backend:
 *    Run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 * 
 * 2. Configure Environment Variables (.env):
 *    USE_S3_UPLOAD=true
 *    AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
 *    AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
 *    AWS_REGION=us-east-1
 *    AWS_S3_BUCKET=intervix-candidate-resumes
 *    AWS_PRESIGNED_EXPIRY_SECONDS=3600
 *    CLOUDFRONT_DISTRIBUTION_URL=https://resumes.intervix.com  # Optional for edge caching CDN
 * 
 * 3. Configure CORS on your AWS S3 Bucket:
 *    Navigate to the AWS S3 Console -> select your bucket -> Permissions tab -> CORS configuration.
 *    Paste the following JSON policy to allow secure browser previews:
 *    [
 *      {
 *        "AllowedHeaders": ["*"],
 *        "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
 *        "AllowedOrigins": [
 *          "https://app.intervix.com", 
 *          "http://localhost:5173"
 *        ],
 *        "ExposeHeaders": ["ETag"],
 *        "MaxAgeSeconds": 3000
 *      }
 *    ]
 * 
 * 4. S3 Bucket IAM Access Policy:
 *    Assign your IAM Web-Identity role or User access policy with S3 actions restricted to this bucket:
 *    {
 *      "Version": "2012-10-17",
 *      "Statement": [
 *        {
 *          "Effect": "Allow",
 *          "Action": [
 *            "s3:PutObject",
 *            "s3:GetObject",
 *            "s3:DeleteObject"
 *          ],
 *          "Resource": "arn:aws:s3:::intervix-candidate-resumes/*"
 *        }
 *      ]
 *    }
 * 
 * =========================================================================
 */
