const cloudinary = require('../config/cloudinary');
const logger = require('../config/logger');
const ApiError = require('../utils/api-error');

class CloudinaryService {
  async uploadRawFile(filePath, folder, uniqueFilename) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'raw', // Critical for PDFs/DOCX
        folder: `intervix/${folder}`,
        public_id: uniqueFilename,
        overwrite: true,
      });
      return result;
    } catch (error) {
      logger.error({ tag: 'CLOUDINARY', message: 'Upload failed', error: error.message });
      throw new ApiError(502, 'Failed to upload file to cloud storage');
    }
  }

  async deleteRawFile(publicId) {
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      logger.info({ tag: 'CLOUDINARY', message: `Deleted file: ${publicId}` });
    } catch (error) {
      logger.error({ tag: 'CLOUDINARY', message: 'Delete failed', publicId, error: error.message });
    }
  }
  
  async checkHealth() {
    // Pings the Cloudinary API to verify credentials and connectivity
    return cloudinary.api.ping();
  }
}

module.exports = new CloudinaryService();