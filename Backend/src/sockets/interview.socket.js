const logger = require('../config/logger');
const LiveInterview = require('../models/LiveInterview');
const liveInterviewService = require('../services/live-interview.service');
const codeExecutionService = require('../services/code-execution.service');

const logSocketError = (socket, event, error) => {
  logger.warn(`[SOCKET] ${event} failed for ${socket.id}: ${error.message}`);
  socket.emit('interview_error', {
    event,
    message: error.message,
    statusCode: error.statusCode || 500
  });
};

const touchRoom = async (roomId, update) => LiveInterview.findOneAndUpdate(
  liveInterviewService.roomLookup(roomId),
  update,
  { new: true }
);

/**
 * Registers real-time coding room and WebRTC signaling event handlers.
 * 
 * @param {object} io - Socket.io server instance
 * @param {object} socket - Connected socket client instance
 */
const registerInterviewHandlers = (io, socket) => {
  socket.on('join_interview', async ({ roomId } = {}) => {
    try {
      if (!roomId) {
        throw new Error('roomId is required');
      }

      const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'join');
      const joinedRoom = await liveInterviewService.markParticipantJoined({
        roomId: access.room._id,
        user: socket.user,
        role: access.role,
        socketId: socket.id
      });

      const interviewRoomName = liveInterviewService.roomName(joinedRoom._id);
      socket.join(interviewRoomName);
      socket.data.liveInterviewRooms = socket.data.liveInterviewRooms || new Set();
      socket.data.liveInterviewRooms.add(interviewRoomName);
      socket.data.liveInterviewRole = access.role;

      socket.emit('interview_state', liveInterviewService.buildRoomPayload(joinedRoom, access.role));
      socket.to(interviewRoomName).emit('participant_joined', {
        socketId: socket.id,
        user: {
          _id: socket.user._id,
          name: socket.user.name || socket.user.email,
          role: access.role
        }
      });

      const clients = Array.from(io.sockets.adapter.rooms.get(interviewRoomName) || []).filter((id) => id !== socket.id);
      socket.emit('interview_peers', { peers: clients });
      logger.info(`[INTERVIEW_ROOM] ${socket.user.email || socket.user._id} joined ${interviewRoomName} as ${access.role}`);
    } catch (error) {
      logSocketError(socket, 'join_interview', error);
    }
  });

  socket.on('leave_interview', async ({ roomId } = {}) => {
    try {
      if (!roomId) return;
      const interviewRoomName = liveInterviewService.roomName(roomId);
      socket.to(interviewRoomName).emit('participant_left', { socketId: socket.id, userId: socket.user._id });
      socket.leave(interviewRoomName);
      await liveInterviewService.markParticipantLeft({ roomIds: [interviewRoomName], user: socket.user, socketId: socket.id });
      logger.info(`[INTERVIEW_ROOM] ${socket.id} left ${interviewRoomName}`);
    } catch (error) {
      logSocketError(socket, 'leave_interview', error);
    }
  });

  socket.on('webrtc_offer', async ({ roomId, offer, to } = {}) => {
    try {
      await liveInterviewService.assertRoomAccess(roomId, socket.user, 'signal');
      const payload = { roomId, offer, from: socket.id };
      if (to) io.to(to).emit('webrtc_offer', payload);
      else socket.to(liveInterviewService.roomName(roomId)).emit('webrtc_offer', payload);
      logger.info(`[WEBRTC] offer relayed for ${roomId}`);
    } catch (error) {
      logSocketError(socket, 'webrtc_offer', error);
    }
  });

  socket.on('webrtc_answer', async ({ roomId, answer, to } = {}) => {
    try {
      await liveInterviewService.assertRoomAccess(roomId, socket.user, 'signal');
      const payload = { roomId, answer, from: socket.id };
      if (to) io.to(to).emit('webrtc_answer', payload);
      else socket.to(liveInterviewService.roomName(roomId)).emit('webrtc_answer', payload);
      logger.info(`[WEBRTC] answer relayed for ${roomId}`);
    } catch (error) {
      logSocketError(socket, 'webrtc_answer', error);
    }
  });

  socket.on('webrtc_ice_candidate', async ({ roomId, candidate, to } = {}) => {
    try {
      await liveInterviewService.assertRoomAccess(roomId, socket.user, 'signal');
      const payload = { roomId, candidate, from: socket.id };
      if (to) io.to(to).emit('webrtc_ice_candidate', payload);
      else socket.to(liveInterviewService.roomName(roomId)).emit('webrtc_ice_candidate', payload);
    } catch (error) {
      logSocketError(socket, 'webrtc_ice_candidate', error);
    }
  });

  socket.on('code_change', async ({ roomId, code, language, version } = {}) => {
    try {
      const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'edit code');
      if (access.room.controls?.editorLocked && access.role === 'candidate') {
        throw new Error('Editor is locked by the recruiter');
      }

      const room = await touchRoom(roomId, {
        $set: {
          'codeState.code': code || '',
          'codeState.language': language || access.room.codeState?.language || 'javascript',
          'codeState.version': Number(version || 0),
          'codeState.updatedAt': new Date()
        },
        $inc: { 'analytics.codeChangeCount': 1 }
      });

      socket.to(liveInterviewService.roomName(room._id)).emit('code_update', {
        code: room.codeState.code,
        language: room.codeState.language,
        version: room.codeState.version,
        from: socket.id
      });
      logger.info(`[CODE_SYNC] code_change ${roomId}`);
    } catch (error) {
      logSocketError(socket, 'code_change', error);
    }
  });

  socket.on('cursor_change', async ({ roomId, cursor } = {}) => {
    try {
      const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'sync cursor');
      await touchRoom(roomId, {
        $set: {
          'codeState.cursor': {
            userId: String(socket.user._id),
            role: access.role,
            lineNumber: cursor?.lineNumber || 1,
            column: cursor?.column || 1
          }
        },
        $inc: { 'analytics.cursorEventCount': 1 }
      });
      socket.to(liveInterviewService.roomName(roomId)).emit('cursor_update', { cursor, from: socket.id, role: access.role });
    } catch (error) {
      logSocketError(socket, 'cursor_change', error);
    }
  });

  socket.on('language_change', async ({ roomId, language } = {}) => {
    try {
      const room = await touchRoom(roomId, {
        $set: { 'codeState.language': language || 'javascript', 'codeState.updatedAt': new Date() },
        $inc: { 'analytics.languageChangeCount': 1 }
      });
      io.to(liveInterviewService.roomName(room._id)).emit('language_update', { language: room.codeState.language, from: socket.id });
      logger.info(`[CODE_SYNC] language_change ${roomId} ${language}`);
    } catch (error) {
      logSocketError(socket, 'language_change', error);
    }
  });

  socket.on('run_code', async ({ roomId, code, language, input } = {}) => {
    try {
      await liveInterviewService.assertRoomAccess(roomId, socket.user, 'run code');
      io.to(liveInterviewService.roomName(roomId)).emit('execution_status', {
        status: 'running',
        executedBy: socket.user.name || socket.user.email
      });

      const result = await codeExecutionService.runCode({ code, language, input });
      const room = await touchRoom(roomId, {
        $push: {
          executionHistory: {
            language,
            code,
            input,
            success: result.success,
            output: result.output,
            error: result.error,
            status: result.status,
            executedBy: socket.user._id,
            executedAt: new Date()
          }
        },
        $inc: { 'analytics.runCount': 1 }
      });

      io.to(liveInterviewService.roomName(room._id)).emit('execution_result', {
        ...result,
        executedBy: socket.user.name || socket.user.email,
        executedAt: new Date().toISOString()
      });
      logger.info(`[RUN_CODE] synced result for ${roomId}`);
    } catch (error) {
      logSocketError(socket, 'run_code', error);
    }
  });

  socket.on('start_screen_share', async ({ roomId } = {}) => {
    try {
      const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'share screen');
      if (access.role !== 'candidate' && access.role !== 'admin') {
        throw new Error('Only the candidate can start screen sharing');
      }
      const room = await touchRoom(roomId, {
        $set: {
          'mediaState.candidateScreenSharing': true,
          'mediaState.screenShareStartedAt': new Date(),
          'controls.requestedScreenShare': false
        },
        $push: { 'analytics.screenShareSessions': { startedAt: new Date() } }
      });
      io.to(liveInterviewService.roomName(room._id)).emit('screen_share_started', { by: 'candidate' });
      logger.info(`[SCREEN_SHARE] started ${roomId}`);
    } catch (error) {
      logSocketError(socket, 'start_screen_share', error);
    }
  });

  socket.on('stop_screen_share', async ({ roomId } = {}) => {
    try {
      const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'stop screen share');
      const room = await LiveInterview.findOne(liveInterviewService.roomLookup(roomId));
      if (!room) throw new Error('Live interview room not found');
      const now = new Date();
      const startedAt = room.mediaState?.screenShareStartedAt;
      const durationSeconds = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;
      const lastSession = room.analytics.screenShareSessions?.[room.analytics.screenShareSessions.length - 1];
      if (lastSession && !lastSession.endedAt) {
        lastSession.endedAt = now;
        lastSession.durationSeconds = durationSeconds;
      }
      room.mediaState.candidateScreenSharing = false;
      room.mediaState.screenShareStartedAt = null;
      room.mediaState.totalScreenShareSeconds += durationSeconds;
      await room.save();
      io.to(liveInterviewService.roomName(room._id)).emit('screen_share_stopped', { by: access.role, durationSeconds });
      logger.info(`[SCREEN_SHARE] stopped ${roomId}`);
    } catch (error) {
      logSocketError(socket, 'stop_screen_share', error);
    }
  });

  socket.on('request_screen_share', async ({ roomId } = {}) => {
    try {
      const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'request screen share');
      if (access.role !== 'recruiter' && access.role !== 'admin') {
        throw new Error('Only recruiters can request screen share');
      }
      const room = await touchRoom(roomId, { $set: { 'controls.requestedScreenShare': true } });
      io.to(liveInterviewService.roomName(room._id)).emit('screen_share_requested', { by: socket.user.name || socket.user.email });
      logger.info(`[SCREEN_SHARE] requested ${roomId}`);
    } catch (error) {
      logSocketError(socket, 'request_screen_share', error);
    }
  });

  socket.on('toggle_audio', async ({ roomId, enabled, targetRole } = {}) => {
    try {
      const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'toggle audio');
      const roleToUpdate = targetRole || access.role;
      if (targetRole && access.role !== 'recruiter' && access.role !== 'admin') {
        throw new Error('Only recruiters can control another participant audio state');
      }
      const key = roleToUpdate === 'candidate' ? 'mediaState.candidateAudioEnabled' : 'mediaState.recruiterAudioEnabled';
      const room = await touchRoom(roomId, { $set: { [key]: Boolean(enabled) }, $inc: { 'analytics.mediaToggleCount': 1 } });
      io.to(liveInterviewService.roomName(room._id)).emit('audio_toggled', { role: roleToUpdate, enabled: Boolean(enabled), by: access.role });
    } catch (error) {
      logSocketError(socket, 'toggle_audio', error);
    }
  });

  socket.on('toggle_video', async ({ roomId, enabled, targetRole } = {}) => {
    try {
      const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'toggle video');
      const roleToUpdate = targetRole || access.role;
      if (targetRole && access.role !== 'recruiter' && access.role !== 'admin') {
        throw new Error('Only recruiters can control another participant video state');
      }
      const key = roleToUpdate === 'candidate' ? 'mediaState.candidateVideoEnabled' : 'mediaState.recruiterVideoEnabled';
      const room = await touchRoom(roomId, { $set: { [key]: Boolean(enabled) }, $inc: { 'analytics.mediaToggleCount': 1 } });
      io.to(liveInterviewService.roomName(room._id)).emit('video_toggled', { role: roleToUpdate, enabled: Boolean(enabled), by: access.role });
    } catch (error) {
      logSocketError(socket, 'toggle_video', error);
    }
  });

  socket.on('lock_editor', async ({ roomId, locked } = {}) => {
    try {
      const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'lock editor');
      if (access.role !== 'recruiter' && access.role !== 'admin') {
        throw new Error('Only recruiters can lock the editor');
      }
      const room = await touchRoom(roomId, { $set: { 'controls.editorLocked': Boolean(locked) } });
      io.to(liveInterviewService.roomName(room._id)).emit('editor_lock_changed', { locked: Boolean(locked), by: access.role });
    } catch (error) {
      logSocketError(socket, 'lock_editor', error);
    }
  });

  socket.on('pause_interview', async ({ roomId, paused } = {}) => {
    try {
      const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'pause interview');
      if (access.role !== 'recruiter' && access.role !== 'admin') {
        throw new Error('Only recruiters can pause the interview');
      }
      const room = await touchRoom(roomId, {
        $set: { status: paused ? 'paused' : 'active', 'controls.paused': Boolean(paused) }
      });
      io.to(liveInterviewService.roomName(room._id)).emit('interview_paused', { paused: Boolean(paused), by: access.role });
    } catch (error) {
      logSocketError(socket, 'pause_interview', error);
    }
  });

  socket.on('send_prompt', async ({ roomId, prompt } = {}) => {
    try {
      const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'send prompt');
      if (access.role !== 'recruiter' && access.role !== 'admin') {
        throw new Error('Only recruiters can send interview prompts');
      }
      io.to(liveInterviewService.roomName(roomId)).emit('prompt_received', {
        prompt: String(prompt || '').slice(0, 2000),
        by: socket.user.name || socket.user.email,
        at: new Date().toISOString()
      });
    } catch (error) {
      logSocketError(socket, 'send_prompt', error);
    }
  });

  socket.on('end_interview', async ({ roomId } = {}) => {
    try {
      const access = await liveInterviewService.assertRoomAccess(roomId, socket.user, 'end interview');
      if (access.role !== 'recruiter' && access.role !== 'admin') {
        throw new Error('Only recruiters can end the interview');
      }
      const now = new Date();
      const room = await LiveInterview.findOne(liveInterviewService.roomLookup(roomId));
      if (!room) throw new Error('Live interview room not found');
      room.status = 'completed';
      room.controls.endedBy = socket.user._id;
      room.controls.endedAt = now;
      room.analytics.endedAt = now;
      room.analytics.durationSeconds = room.analytics.startedAt ? Math.max(0, Math.round((now - room.analytics.startedAt) / 1000)) : 0;
      await room.save();
      io.to(liveInterviewService.roomName(room._id)).emit('interview_ended', { endedBy: access.role, endedAt: now.toISOString() });
      logger.info(`[INTERVIEW_ROOM] ended ${roomId}`);
    } catch (error) {
      logSocketError(socket, 'end_interview', error);
    }
  });

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
    const liveRooms = Array.from(socket.rooms).filter(room => room.startsWith('interview_'));
    liveRooms.forEach(roomName => {
      socket.to(roomName).emit('participant_left', {
        socketId: socket.id,
        user: {
          _id: socket.user?._id,
          name: socket.user?.name,
          role: socket.data.liveInterviewRole || socket.user?.role,
        },
      });
    });
    liveInterviewService.markParticipantLeft({ roomIds: liveRooms, user: socket.user, socketId: socket.id })
      .catch((error) => logger.warn(`[INTERVIEW_ROOM] disconnect cleanup failed: ${error.message}`));

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
