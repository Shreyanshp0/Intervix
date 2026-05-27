import * as socketIo from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../config/logger.js';
import interviewSessionService from '../services/interview-session.service.js';
import timerService from '../services/timer.service.js';
import realtimeService from '../services/realtime.service.js';
import voiceOrchestratorService from '../services/voice-orchestrator.service.js';
import registerInterviewHandlers from './interview.socket.js';
import { getTrustedOrigins } from '../config/security.js';
import liveInterviewService from '../services/live-interview.service.js';

let io;
const activeUserSockets = new Map();

export const getActiveSocketsForUser = (userId) => {
  const uid = String(userId);
  return activeUserSockets.get(uid) || new Set();
};

export const sendNotificationToUser = (userId, notification) => {
  const uid = String(userId);
  const sockets = activeUserSockets.get(uid);
  if (sockets && sockets.size > 0) {
    if (!io) {
      logger.warn('[Sockets] Cannot send notification, socket server io not initialized');
      return false;
    }
    for (const socketId of sockets) {
      io.to(socketId).emit('notification', notification);
    }
    return true;
  }
  return false;
};

const timerIntervals = new Map();
const normalizeOrigin = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return raw.replace(/\/+$/, '').toLowerCase();
  }
};

const startTimerFeed = (socket, session) => {
  const key = `${socket.id}:${session._id}`;
  if (timerIntervals.has(key)) {
    clearInterval(timerIntervals.get(key));
  }

  const interval = setInterval(async () => {
    try {
      const refreshed = await interviewSessionService.getSessionById(session._id);
      if (!refreshed) {
        clearInterval(interval);
        timerIntervals.delete(key);
        return;
      }

      const remainingSeconds = timerService.getRemainingSeconds(refreshed);
      socket.emit('interview:timer', {
        sessionId: String(refreshed._id),
        remainingSeconds,
        serverTime: new Date().toISOString(),
        status: refreshed.status,
      });

      if (remainingSeconds <= 0 || refreshed.status !== 'active') {
        clearInterval(interval);
        timerIntervals.delete(key);
      }
    } catch (error) {
      logger.error(`[Sockets] Timer feed error: ${error.message}`);
      clearInterval(interval);
      timerIntervals.delete(key);
    }
  }, 1000);

  timerIntervals.set(key, interval);
};

const stopSocketFeeds = (socket) => {
  [...timerIntervals.keys()]
    .filter((key) => key.startsWith(`${socket.id}:`))
    .forEach((key) => {
      clearInterval(timerIntervals.get(key));
      timerIntervals.delete(key);
    });
};

const authenticateSocket = async (socket, next) => {
  try {
    if (typeof next !== 'function') {
      logger.error('[SOCKET] authenticateSocket invoked without a valid next callback');
      return;
    }

    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return next(new Error('Unauthorized'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub).select('-password');
    if (!user) {
      return next(new Error('Unauthorized'));
    }

    socket.user = user;
    return next();
  } catch (error) {
    return next(new Error('Unauthorized'));
  }
};

const initSocket = (server) => {
  io = new socketIo.Server(server, {
    cors: {
      origin: getTrustedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 30000,
    maxHttpBufferSize: 1e6,
    transports: ['websocket', 'polling'],
    allowRequest: (req, callback) => {
      const origin = normalizeOrigin(req.headers.origin);
      const trustedOrigins = getTrustedOrigins().map(normalizeOrigin);
      const allowed = !origin || trustedOrigins.includes(origin);
      if (!allowed) {
        logger.warn({ tag: 'SOCKET', message: 'Blocked untrusted socket origin', origin });
      }
      callback(null, allowed);
    }
  });

  realtimeService.registerIoGetter(() => io);
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);
    const userId = String(socket.user._id);
    if (!activeUserSockets.has(userId)) {
      activeUserSockets.set(userId, new Set());
    }
    activeUserSockets.get(userId).add(socket.id);
    logger.info(`[SOCKET_REGISTRY] Registered socket ${socket.id} for user ${userId}`);

    registerInterviewHandlers(io, socket);

    socket.on('interview:join', async ({ sessionId, tabId }) => {
      try {
        const session = await interviewSessionService.markRecovered(sessionId, {
          socketId: socket.id,
          userId: socket.user._id,
          tabId,
        });

        socket.join(String(sessionId));
        socket.emit('interview:state', interviewSessionService.buildRecoveryPayload(session));
        startTimerFeed(socket, session);
        logger.info(`Socket ${socket.id} joined interview ${sessionId}`);
      } catch (error) {
        socket.emit('interview:error', { message: error.message, details: error.details });
      }
    });

    socket.on('interview:recover', async ({ sessionId, tabId }) => {
      try {
        const session = await interviewSessionService.markRecovered(sessionId, {
          socketId: socket.id,
          userId: socket.user._id,
          tabId,
        });

        socket.join(String(sessionId));
        socket.emit('interview:recovered', interviewSessionService.buildRecoveryPayload(session));
        startTimerFeed(socket, session);
      } catch (error) {
        socket.emit('interview:error', { message: error.message, details: error.details });
      }
    });

    socket.on('interview:autosave', async ({ sessionId, currentAnswerDraft, aiState, activePhase, tabId }) => {
      try {
        const session = await interviewSessionService.persistDraft(sessionId, socket.user._id, {
          currentAnswerDraft,
          aiState,
          activePhase,
          tabId,
          connectionState: 'connected',
        });
        socket.emit('interview:autosaved', {
          sessionId,
          autosaveVersion: session.meta?.autosaveVersion || 0,
          savedAt: new Date().toISOString(),
        });
      } catch (error) {
        socket.emit('interview:error', { message: error.message, details: error.details });
      }
    });

    socket.on('interview:heartbeat', async ({ sessionId, tabId }) => {
      if (!sessionId) {
        return;
      }

      await interviewSessionService.updateRuntimeState(sessionId, {
        recovery: {
          lastSocketId: socket.id,
          lastClientSyncAt: new Date(),
          lastKnownConnectionState: 'connected',
          lastKnownTabId: tabId || '',
        },
      });
    });

    socket.on('interview:speech_interrupt', async ({ sessionId }) => {
      if (!sessionId) {
        return;
      }

      await voiceOrchestratorService.interruptSpeech(sessionId);
    });

    // Live Technical Notepad Collaborative Room Events
    socket.on('live:join', async ({ roomId, role, userName }) => {
      try {
        if (!roomId) return;
        const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'join legacy live room');
        const roomName = `live-${roomId}`;
        socket.join(roomName);
        socket.to(roomName).emit('live:user_joined', { role: access.role || role, userName, socketId: socket.id });
        logger.info(`[SOCKET] Legacy live room join allowed for ${socket.user._id} in ${roomId}`);
      } catch (error) {
        socket.emit('live:error', { message: error.message });
      }
    });

    socket.on('live:notepad_sync', async ({ roomId, content }) => {
      try {
        if (!roomId) return;
        await liveInterviewService.assertRoomAccess(roomId, socket.user, 'sync legacy notepad');
        socket.to(`live-${roomId}`).emit('live:notepad_updated', { content });
      } catch (error) {
        socket.emit('live:error', { message: error.message });
      }
    });

    socket.on('live:signal', async ({ roomId, signal, to }) => {
      try {
        if (!roomId) return;
        await liveInterviewService.assertRoomAccess(roomId, socket.user, 'signal legacy live room');
        if (to) {
          io.to(to).emit('live:signal', { signal, from: socket.id });
        } else {
          socket.to(`live-${roomId}`).emit('live:signal', { signal, from: socket.id });
        }
      } catch (error) {
        socket.emit('live:error', { message: error.message });
      }
    });

    socket.on('live:end', async ({ roomId }) => {
      try {
        if (!roomId) return;
        const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'end legacy live room');
        if (access.role !== 'recruiter' && access.role !== 'admin') {
          throw new Error('Only recruiters can end live rooms');
        }
        io.to(`live-${roomId}`).emit('live:ended');
        logger.info(`[SOCKET] Legacy live room ended ${roomId}`);
      } catch (error) {
        socket.emit('live:error', { message: error.message });
      }
    });

    socket.on('disconnect', async () => {
      stopSocketFeeds(socket);
      if (activeUserSockets.has(userId)) {
        activeUserSockets.get(userId).delete(socket.id);
        if (activeUserSockets.get(userId).size === 0) {
          activeUserSockets.delete(userId);
        }
      }
      logger.info(`Client disconnected: ${socket.id} for user ${userId}`);
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export { initSocket, getIo };
