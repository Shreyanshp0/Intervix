import { io } from 'socket.io-client';
import { getApiOrigin } from '../constants/apiRoutes';

let socket;

export const getSocket = () => {
  if (socket) {
    return socket;
  }

  const origin = getApiOrigin() || window.location.origin;

  socket = io(origin, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    auth: {
      token: localStorage.getItem('token'),
    },
  });

  socket.on('connect_error', (error) => {
    console.warn('[SOCKET] connect_error', error.message);
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
