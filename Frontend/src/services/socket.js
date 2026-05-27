import { io } from 'socket.io-client';
import { getApiOrigin } from '../constants/apiRoutes';

let socket;

export const getSocket = () => {
  if (socket) {
    return socket;
  }

  const configuredSocketOrigin = import.meta.env.VITE_SOCKET_URL || '';
  const origin = configuredSocketOrigin || getApiOrigin() || window.location.origin;
  const isHttps = window.location.protocol === 'https:';
  const transports = isHttps ? ['websocket'] : ['websocket', 'polling'];

  socket = io(origin, {
    autoConnect: false,
    transports,
    upgrade: true,
    secure: isHttps,
    path: '/socket.io',
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 8000,
    randomizationFactor: 0.5,
    timeout: 20000,
    auth: {
      token: localStorage.getItem('token'),
    },
  });

  socket.on('connect_error', (error) => {
    console.warn('[SOCKET] connect_error', error.message, { origin, secure: isHttps });
  });

  socket.on('disconnect', (reason) => {
    console.warn('[SOCKET] disconnect', reason);
  });

  socket.on('reconnect', (attempt) => {
    console.info('[SOCKET] reconnect', attempt);
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    socket.auth = { token: localStorage.getItem('token') };
    console.info('[SOCKET] reconnect_attempt', attempt);
  });

  return socket;
};

export const connectSocket = () => {
  const client = getSocket();
  client.auth = {
    token: localStorage.getItem('token'),
  };

  if (!client.connected) {
    client.connect();
  }

  return client;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};
