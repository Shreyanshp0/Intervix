const buildIceServers = () => {
  const servers = [{ urls: ['stun:stun.l.google.com:19302'] }];
  const turnUrls = (process.env.TURN_URL || '')
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
    iceServers
  });
};

