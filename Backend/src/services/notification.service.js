import Notification from '../models/Notification.js';
import { sendNotificationToUser } from '../sockets/index.js';
import ApiError from '../utils/api-error.js';
import logger from '../config/logger.js';

class NotificationService {
  /**
   * Create a new database notification and emit it in real time if the user is online.
   * 
   * @param {object} payload - Notification data
   * @returns {object} Created notification document
   */
  async createNotification({ userId, type, title, message, metadata = {} }) {
    if (!userId || !type || !title || !message) {
      throw new ApiError(400, 'userId, type, title, and message are required');
    }

    try {
      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        metadata
      });

      // Try sending realtime packet
      const deliveredRealtime = sendNotificationToUser(userId, notification);
      logger.info({
        tag: 'NOTIFICATION_CREATE',
        userId: String(userId),
        type,
        notificationId: String(notification._id),
        deliveredRealtime
      });

      return notification;
    } catch (error) {
      logger.error(`[NotificationService] Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch all notifications for a specific user.
   * 
   * @param {string} userId - Target user ID
   * @returns {Array} Array of notification documents
   */
  async getUserNotifications(userId) {
    return Notification.find({ userId }).sort({ createdAt: -1 }).limit(100);
  }

  /**
   * Mark a specific notification as read.
   * 
   * @param {string} notificationId - Target notification ID
   * @param {string} userId - Owning user ID
   * @returns {object} Updated notification document
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      throw new ApiError(404, 'Notification not found or unauthorized');
    }

    return notification;
  }

  /**
   * Mark all notifications for a user as read.
   * 
   * @param {string} userId - Owning user ID
   * @returns {object} Update details
   */
  async markAllAsRead(userId) {
    return Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );
  }
}

export default new NotificationService();
