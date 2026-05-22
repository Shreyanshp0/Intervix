const socketIo = require('socket.io');
const logger = require('../config/logger');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*', // Adjust for production
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);

    socket.on('join_interview', (data) => {
      // join room logic
      const { interviewId } = data;
      if (interviewId) {
        socket.join(interviewId);
        logger.info(`Socket ${socket.id} joined interview ${interviewId}`);
      }
    });

    socket.on('typing', (data) => {
      const { interviewId, isTyping } = data;
      if (interviewId) {
        socket.to(interviewId).emit('participant_typing', { isTyping });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = { initSocket, getIo };
