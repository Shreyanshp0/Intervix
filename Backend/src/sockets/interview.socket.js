const logger = require('../config/logger');

/**
 * Registers real-time coding room and WebRTC signaling event handlers.
 * 
 * @param {object} io - Socket.io server instance
 * @param {object} socket - Connected socket client instance
 */
const registerInterviewHandlers = (io, socket) => {
  // Join Room
  socket.on('join-room', ({ roomId }) => {
    if (!roomId) {
      return socket.emit('room-error', { message: 'Room ID is required to join' });
    }

    const roomName = `room-${roomId}`;
    socket.join(roomName);
    logger.info(`[Sockets] User ${socket.user?.name || socket.id} joined room: ${roomName}`);

    // Notify other participants in the room
    socket.to(roomName).emit('user-joined', {
      socketId: socket.id,
      user: {
        _id: socket.user?._id,
        name: socket.user?.name,
        role: socket.user?.role,
      },
    });

    // Provide the joining client with a list of other participants currently in the room
    // to determine who will initiate the WebRTC connection.
    const clients = io.sockets.adapter.rooms.get(roomName);
    const peerSocketIds = Array.from(clients || []).filter(id => id !== socket.id);
    
    socket.emit('room-joined', {
      roomId,
      peers: peerSocketIds,
    });
  });

  // Real-time Code Editor Sync
  socket.on('code-change', ({ roomId, code, language }) => {
    if (!roomId) return;
    socket.to(`room-${roomId}`).emit('code-update', { code, language });
  });

  // Relaying Question Change (Interviewer side control)
  socket.on('question-change', ({ roomId, questionId, starterCode, starterLanguage }) => {
    if (!roomId) return;
    socket.to(`room-${roomId}`).emit('question-changed', { questionId, starterCode, starterLanguage });
  });

  // Screen Share Status Relay
  socket.on('screen-share-status', ({ roomId, isSharing }) => {
    if (!roomId) return;
    socket.to(`room-${roomId}`).emit('screen-share-updated', { isSharing });
  });

  // WebRTC Signaling: Offer
  socket.on('offer', ({ roomId, offer }) => {
    if (!roomId) return;
    logger.info(`[WebRTC] Relay SDP offer from ${socket.id} to room-${roomId}`);
    socket.to(`room-${roomId}`).emit('offer', {
      offer,
      senderId: socket.id,
    });
  });

  // WebRTC Signaling: Answer
  socket.on('answer', ({ roomId, answer }) => {
    if (!roomId) return;
    logger.info(`[WebRTC] Relay SDP answer from ${socket.id} to room-${roomId}`);
    socket.to(`room-${roomId}`).emit('answer', {
      answer,
      senderId: socket.id,
    });
  });

  // WebRTC Signaling: ICE Candidates
  socket.on('ice-candidate', ({ roomId, candidate }) => {
    if (!roomId) return;
    socket.to(`room-${roomId}`).emit('ice-candidate', {
      candidate,
      senderId: socket.id,
    });
  });

  // Clean Disconnect / Leaving Handling
  socket.on('disconnecting', () => {
    // Find all interview rooms the socket is currently part of
    const rooms = Array.from(socket.rooms).filter(room => room.startsWith('room-'));
    
    rooms.forEach(roomName => {
      socket.to(roomName).emit('user-left', {
        socketId: socket.id,
        user: {
          _id: socket.user?._id,
          name: socket.user?.name,
          role: socket.user?.role,
        },
      });
      logger.info(`[Sockets] User ${socket.user?.name || socket.id} left room: ${roomName}`);
    });
  });
};

module.exports = registerInterviewHandlers;
