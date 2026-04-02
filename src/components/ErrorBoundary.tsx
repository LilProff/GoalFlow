import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    if (window.confirm('This will clear all your local data and progress. Are you sure?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-center">
              <div className="p-4 bg-red-500/10 rounded-full">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-black tracking-tighter uppercase italic">System Failure</h1>
              <p className="text-zinc-500 text-sm">
                GoalFlow encountered a critical error. This is often caused by corrupted local data.
              </p>
            </div>

            <div className="bg-black/40 rounded-xl p-4 border border-zinc-800">
              <p className="text-xs font-mono text-red-400 break-all">
                {this.state.error?.message || 'Unknown Error'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-100 text-zinc-950 rounded-xl font-bold uppercase tracking-widest hover:bg-white transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Reload App
              </button>
              
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Reset All Data
              </button>
            </div>

            <p className="text-[10px] text-center text-zinc-600 uppercase tracking-widest">
              Samuel's GoalFlow AI PA • Recovery Mode
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
