const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');
const interviewSessionService = require('../services/interview-session.service');
const timerService = require('../services/timer.service');
const realtimeService = require('../services/realtime.service');
const voiceOrchestratorService = require('../services/voice-orchestrator.service');

let io;
const timerIntervals = new Map();

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
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  realtimeService.registerIoGetter(() => io);
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);

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

    socket.on('disconnect', async () => {
      stopSocketFeeds(socket);
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
