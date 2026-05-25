import { io } from 'socket.io-client';

let socket;

export const getSocket = () => {
  if (socket) {
    return socket;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://13.127.10.169:5000/api';
  const origin = apiBaseUrl.replace(/\/api\/?$/, '');

  socket = io(origin, {
    autoConnect: false,
    transports: ['websocket'],
    auth: {
      token: localStorage.getItem('token'),
    },
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
