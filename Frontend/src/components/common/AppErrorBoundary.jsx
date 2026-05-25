import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[APP_ERROR_BOUNDARY]', error, info);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-[28px] border border-rose-500/20 bg-rose-500/5 p-8 text-center">
            <AlertTriangle className="mx-auto text-rose-400" size={40} />
            <h1 className="mt-4 text-xl font-semibold text-white">Something needs a refresh</h1>
            <p className="mt-2 text-sm leading-6 text-rose-200/80">
              A component failed to render safely. The app stayed alive so you can retry without losing the whole workspace.
            </p>
            <div className="mt-6">
              <Button className="gap-2" onClick={this.handleRetry}>
                <RefreshCw size={16} />
                Retry
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
