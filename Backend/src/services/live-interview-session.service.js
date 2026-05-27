import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import ApiError from '../utils/api-error.js';

const sessionStore = new Map();

const getSessionSecret = () => process.env.JWT_SECRET;

const getExpiresAt = (ttlMinutes = 30) => new Date(Date.now() + (Number(ttlMinutes) * 60 * 1000));

const issueJoinToken = ({ roomId, role, userId, ttlMinutes = 30 }) => {
  if (!roomId) {
    throw new ApiError(400, 'roomId is required to issue a join token');
  }

  const jti = crypto.randomUUID();
  const expiresAt = getExpiresAt(ttlMinutes);
  const token = jwt.sign(
    {
      roomId: String(roomId),
      role,
      jti
    },
    getSessionSecret(),
    {
      subject: String(userId || ''),
      expiresIn: `${Math.max(1, Number(ttlMinutes) || 30)}m`
    }
  );

  sessionStore.set(jti, {
    jti,
    token,
    roomId: String(roomId),
    role,
    userId: String(userId || ''),
    expiresAt,
    status: 'active',
    createdAt: new Date(),
    revokedAt: null,
    endedAt: null
  });

  return {
    token,
    jti,
    expiresAt: expiresAt.toISOString(),
    sessionUrl: `/interview/session?token=${encodeURIComponent(token)}`
  };
};

const verifyJoinToken = (token, user) => {
  if (!token) {
    throw new ApiError(401, 'Session token is required');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getSessionSecret());
  } catch (error) {
    throw new ApiError(410, 'Interview session has ended or expired');
  }

  const record = sessionStore.get(decoded.jti);
  if (!record) {
    throw new ApiError(410, 'Interview session has ended or expired');
  }

  if (record.status !== 'active') {
    throw new ApiError(410, 'Interview session has ended or expired');
  }

  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
    record.status = 'expired';
    record.revokedAt = new Date();
    throw new ApiError(410, 'Interview session has ended or expired');
  }

  if (user && decoded.sub && String(decoded.sub) !== String(user._id)) {
    throw new ApiError(403, 'This interview session token was issued for a different user');
  }

  return {
    ...decoded,
    token,
    record
  };
};

const revokeRoomSessions = (roomId, reason = 'ended') => {
  const normalizedRoomId = String(roomId || '').trim();
  if (!normalizedRoomId) return;

  for (const record of sessionStore.values()) {
    if (record.roomId !== normalizedRoomId) continue;
    record.status = reason === 'expired' ? 'expired' : 'ended';
    record.revokedAt = new Date();
    if (reason === 'expired') {
      record.endedAt = new Date();
    }
  }
};

const purgeExpiredSessionRecords = () => {
  const now = Date.now();
  for (const [jti, record] of sessionStore.entries()) {
    if ((record.status === 'ended' || record.status === 'expired') && record.revokedAt && (now - record.revokedAt.getTime()) > (30 * 60 * 1000)) {
      sessionStore.delete(jti);
      continue;
    }

    if (record.expiresAt && record.expiresAt.getTime() <= now) {
      record.status = 'expired';
      record.revokedAt = record.revokedAt || new Date();
    }
  }
};

export {
  issueJoinToken,
  verifyJoinToken,
  revokeRoomSessions,
  purgeExpiredSessionRecords
};