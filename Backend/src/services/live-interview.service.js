const LiveInterview = require('../models/LiveInterview');
const CandidateProfile = require('../models/CandidateProfile');
const RecruiterProfile = require('../models/RecruiterProfile');
const ApiError = require('../utils/api-error');
const mongoose = require('mongoose');

const roomName = (roomId) => `interview_${roomId}`;

const roomLookup = (roomId) => {
  const clauses = [{ roomId: String(roomId) }];
  if (mongoose.Types.ObjectId.isValid(String(roomId))) {
    clauses.unshift({ _id: roomId });
  }
  return { $or: clauses };
};

const getRoleProfile = async (user) => {
  if (user.role === 'candidate') {
    const profile = await CandidateProfile.findOne({ user: user._id }).populate('resume');
    return { role: 'candidate', profile };
  }

  if (user.role === 'recruiter') {
    const profile = await RecruiterProfile.findOne({ user: user._id });
    return { role: 'recruiter', profile };
  }

  if (user.role === 'admin') {
    return { role: 'admin', profile: null };
  }

  return { role: user.role, profile: null };
};

const populateRoom = (query) => query.populate([
  {
    path: 'candidate',
    select: 'name email phone location profilePhoto aboutMe skills experience education projects github linkedin portfolio resume',
    populate: { path: 'resume', select: 'fileName fileUrl rawText aiAnalysis parsingStatus uploadedAt' }
  },
  { path: 'recruiter', select: 'name email title' },
  { path: 'job', select: 'roleTitle requiredSkills description location employmentType' },
  { path: 'application', select: 'stage matchSnapshot interviewSchedule coverLetter' }
]);

const findRoomById = async (roomId) => {
  const room = await populateRoom(LiveInterview.findOne(roomLookup(roomId)));

  if (!room) {
    throw new ApiError(404, 'Live interview room not found');
  }

  return room;
};

const assertRoomAccess = async (roomId, user, requiredAction = 'join') => {
  const room = await findRoomById(roomId);
  const { role, profile } = await getRoleProfile(user);

  if (role === 'admin') {
    return { room, role: 'admin', profile };
  }

  if (role === 'candidate' && profile && String(room.candidate?._id || room.candidate) === String(profile._id)) {
    return { room, role, profile };
  }

  if (role === 'recruiter' && profile && String(room.recruiter?._id || room.recruiter) === String(profile._id)) {
    return { room, role, profile };
  }

  throw new ApiError(403, `You are not allowed to ${requiredAction} this interview room`);
};

const buildRoomPayload = (room, role) => ({
  room: {
    id: String(room._id),
    roomId: room.roomId || String(room._id),
    status: room.status,
    scheduledAt: room.scheduledAt,
    role,
    problem: room.problem,
    codeState: room.codeState,
    mediaState: room.mediaState,
    controls: room.controls,
    analytics: room.analytics,
    executionHistory: room.executionHistory?.slice(-20) || [],
    notepadContent: room.notepadContent,
    recruiterNotes: role === 'recruiter' || role === 'admin' ? room.recruiterNotes : '',
    candidate: room.candidate,
    recruiter: room.recruiter,
    job: room.job,
    application: room.application,
    evaluation: role === 'recruiter' || role === 'admin' ? room.evaluation : undefined,
  }
});

const markParticipantJoined = async ({ roomId, user, role, socketId }) => {
  const room = await LiveInterview.findOne(roomLookup(roomId));
  if (!room) {
    throw new ApiError(404, 'Live interview room not found');
  }

  const now = new Date();
  const existing = room.participants.find((p) => String(p.user) === String(user._id));
  if (existing) {
    existing.socketId = socketId;
    existing.role = role;
    existing.name = user.name || user.email || role;
    existing.connected = true;
    existing.leftAt = null;
    room.analytics.reconnectCount += 1;
  } else {
    room.participants.push({
      user: user._id,
      role,
      socketId,
      name: user.name || user.email || role,
      joinedAt: now,
      connected: true
    });
  }

  if (room.status === 'scheduled') {
    room.status = 'active';
  }

  if (!room.analytics.startedAt) {
    room.analytics.startedAt = now;
  }

  await room.save();
  return findRoomById(roomId);
};

const markParticipantLeft = async ({ roomIds, user, socketId }) => {
  if (!roomIds.length) return;
  await Promise.all(roomIds.map(async (interviewRoom) => {
    const roomId = interviewRoom.replace(/^interview_/, '');
    const room = await LiveInterview.findOne(roomLookup(roomId));
    if (!room) return;
    const participant = room.participants.find((p) => String(p.user) === String(user._id) || p.socketId === socketId);
    if (participant) {
      participant.connected = false;
      participant.leftAt = new Date();
      await room.save();
    }
  }));
};

module.exports = {
  roomName,
  assertRoomAccess,
  buildRoomPayload,
  findRoomById,
  markParticipantJoined,
  markParticipantLeft,
  roomLookup,
};
