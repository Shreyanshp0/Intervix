import crypto from 'crypto';
import handleControllerError from '../utils/controller-error.js';

/**
 * Creates a unique roomId for collaborative interviews.
 */
const createRoom = async (req, res, next) => {
  try {
    const roomId = crypto.randomBytes(8).toString('hex');
    return res.status(201).json({
      success: true,
      roomId,
      message: 'Room generated successfully',
    });
  }catch (error) {
    return handleControllerError('room.controller.createRoom', res, next, error);
  }
};

/**
 * Checks if a room exists or is active (currently stubbed for database validation).
 */
const validateRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }
    // Rooms are created dynamically; in production, you could verify in MongoDB
    return res.status(200).json({
      success: true,
      roomId,
      active: true,
    });
  } catch (error) {
    return handleControllerError('room.controller.validateRoom', res, next, error);
  }
};

export {
  createRoom,
  validateRoom,
};
