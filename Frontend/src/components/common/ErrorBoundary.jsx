import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-[#070A12] text-slate-100 rounded-2xl border border-red-500/20 shadow-2xl h-full min-h-[400px]">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white">Component Crash Detected</h2>
          <p className="text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
            {this.state.error?.message || 'A critical component failed to render safely. The problem has been logged.'}
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <div className="mb-6 max-w-3xl w-full text-left bg-black/50 p-4 rounded-xl overflow-auto text-xs font-mono text-red-300 border border-red-500/10 max-h-[300px]">
              {this.state.errorInfo.componentStack}
            </div>
          )}
          
          <Button onClick={this.handleReset} variant="secondary" className="gap-2">
            <RefreshCw size={16} /> Recover & Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;