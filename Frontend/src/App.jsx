import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-gray-100 selection:bg-primary/30">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
