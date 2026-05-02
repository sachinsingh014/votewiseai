import React from 'react';

/**
 * Reusable Error Boundary for scoped error handling.
 * Prevents a single component failure from crashing the entire app.
 */
export class ScopedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In a real app, send to Sentry/Datadog here
    console.error('ScopedErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center text-center min-h-[150px]">
          <span className="material-symbols-outlined text-red-500 mb-2">error</span>
          <h3 className="text-red-800 font-semibold text-sm mb-1">Something went wrong here.</h3>
          <p className="text-red-600 text-xs mb-3 max-w-[250px]">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
