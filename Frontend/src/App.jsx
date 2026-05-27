import { BrowserRouter } from 'react-router-dom';
import { useEffect } from 'react';
import AppRoutes from './routes';
import { useAuthStore } from './store/useAuthStore';
import { useNotificationStore } from './store/useNotificationStore';
import { connectSocket } from './services/socket';
import RealtimeToastContainer from './components/common/RealtimeToastContainer';

function App() {
  const bootstrapAuth = useAuthStore((state) => state.bootstrapAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      const socket = connectSocket();

      const handleNotification = (item) => {
        useNotificationStore.getState().addNotification(item);
      };

      socket.on('notification', handleNotification);

      return () => {
        socket.off('notification', handleNotification);
      };
    }
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-gray-100 selection:bg-primary/30">
        <AppRoutes />
        <RealtimeToastContainer />
      </div>
    </BrowserRouter>
  );
}

export default App;
