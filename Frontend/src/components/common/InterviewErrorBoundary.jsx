import React from 'react';
import Button from './Button';

class InterviewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[InterviewErrorBoundary] Caught critical rendering crash:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('interview_setup');
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to purge session cache:', e);
    }
    window.location.href = '/candidate/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070A13] text-gray-100 flex items-center justify-center p-6 relative overflow-hidden">
          {/* Ambient Glow Orbs */}
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
          
          <div className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-[#0F1424]/60 backdrop-blur-xl p-10 shadow-[0_0_80px_rgba(239,68,68,0.08)] text-center space-y-8 relative z-10 transition-all duration-300">
            {/* Danger Warning Icon Container */}
            <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto text-red-400 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)] animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">Active Interview Disrupted</h1>
              <p className="text-sm text-gray-400 leading-relaxed max-w-md mx-auto">
                We encountered an unexpected crash while managing your mock interview workspace. Rest assured, your responses and progress are safely saved on our secure cloud.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-4 rounded-2xl bg-[#080B15]/90 border border-white/5 text-[11px] text-red-300/85 font-mono text-left max-h-32 overflow-y-auto leading-relaxed shadow-inner">
                <div className="font-semibold text-red-400 mb-1">Diagnostic Log:</div>
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Button 
                variant="secondary" 
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full sm:w-auto font-medium py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm"
              >
                Attempt Recovery
              </Button>
              <Button 
                variant="danger" 
                onClick={this.handleReset}
                className="w-full sm:w-auto font-medium py-2.5 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all text-sm border-0 bg-red-600 hover:bg-red-500"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default InterviewErrorBoundary;
