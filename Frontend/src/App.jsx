import { BrowserRouter } from 'react-router-dom';
import { useEffect } from 'react';
import AppRoutes from './routes';
import { useAuthStore } from './store/useAuthStore';

function App() {
  const bootstrapAuth = useAuthStore((state) => state.bootstrapAuth);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-gray-100 selection:bg-primary/30">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
