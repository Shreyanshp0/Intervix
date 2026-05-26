import logger from '../config/logger.js';

class RealtimeService {
  constructor() {
    this.ioGetter = null;
  }

  registerIoGetter(getter) {
    this.ioGetter = getter;
  }

  getIo() {
    if (!this.ioGetter) {
      return null;
    }

    try {
      return this.ioGetter();
    } catch (error) {
      logger.warn(`[RealtimeService] Socket.IO unavailable: ${error.message}`);
      return null;
    }
  }

  emitToSession(sessionId, event, payload) {
    const io = this.getIo();
    if (!io || !sessionId) {
      return;
    }

    io.to(String(sessionId)).emit(event, payload);
  }

  emitToSocket(socketId, event, payload) {
    const io = this.getIo();
    if (!io || !socketId) {
      return;
    }

    io.to(socketId).emit(event, payload);
  }
}

export default new RealtimeService();
