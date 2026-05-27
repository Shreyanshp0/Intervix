import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './config/monaco'
import App from './App.jsx'
import AppErrorBoundary from './components/common/AppErrorBoundary'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
