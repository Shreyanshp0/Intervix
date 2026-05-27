import notificationService from '../services/notification.service.js';
import handleControllerError from '../utils/controller-error.js';

const getNotifications = async (req, res, next) => {
  try {
    const list = await notificationService.getUserNotifications(req.user._id);
    const unreadCount = list.filter((item) => !item.read).length;
    res.status(200).json({ notifications: list, unreadCount });
  } catch (error) {
    return handleControllerError('notification.controller.getNotifications', res, next, error);
  }
};

const markRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);
    res.status(200).json({ notification });
  } catch (error) {
    return handleControllerError('notification.controller.markRead', res, next, error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user._id);
    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return handleControllerError('notification.controller.markAllRead', res, next, error);
  }
};

export { getNotifications, markRead, markAllRead };
