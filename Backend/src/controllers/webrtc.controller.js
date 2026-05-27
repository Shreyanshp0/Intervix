const buildIceServers = () => {
  const stunUrls = (process.env.STUN_URLS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const servers = [{ urls: stunUrls }];
  const turnUrls = (process.env.TURN_URL || process.env.TURN_URLS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (turnUrls.length) {
    servers.push({
      urls: turnUrls,
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_PASSWORD || ''
    });
  }

  return servers;
};

export const getRtcConfig = (req, res) => {
  const iceServers = buildIceServers();
  res.status(200).json({
    iceServers,
    iceTransportPolicy: process.env.ICE_TRANSPORT_POLICY || 'all',
    iceCandidatePoolSize: Number(process.env.ICE_CANDIDATE_POOL_SIZE || 8)
  });
};
