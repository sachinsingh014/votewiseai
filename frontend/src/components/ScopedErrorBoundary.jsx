import React from 'react';
import PropTypes from 'prop-types';

/**
 * @fileoverview Scoped Error Boundary component for VoteWise AI.
 * @module components/ScopedErrorBoundary
 *
 * Wraps any subtree to catch rendering errors before they propagate
 * to the root and crash the entire application. Renders a recoverable
 * inline error card with a "Try Again" reset button.
 */

/**
 * React class-based Error Boundary that catches rendering errors within its subtree.
 * Must be a class component — React hooks cannot implement componentDidCatch.
 *
 * USAGE: Wrap any feature section that should fail gracefully in isolation:
 * ```jsx
 * <ScopedErrorBoundary>
 *   <MyFeatureComponent />
 * </ScopedErrorBoundary>
 * ```
 */
export class ScopedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    /** @type {{ hasError: boolean, error: Error|null }} */
    this.state = { hasError: false, error: null };
  }

  /**
   * Updates state to trigger the error UI on next render.
   * Called during the render phase — must be a pure static method.
   *
   * @param {Error} error - The error that was thrown
   * @returns {{ hasError: boolean, error: Error }} New state slice
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * Lifecycle method called after a rendering error is caught.
   * Suitable for logging errors to an external monitoring service (Sentry, Datadog, etc.).
   * Runs after the render phase so side-effects (like logging) are safe here.
   *
   * @param {Error} error - The error that was thrown
   * @param {React.ErrorInfo} errorInfo - Component stack trace information
   * @returns {void}
   */
  componentDidCatch(error, errorInfo) {
    // Production: replace with Sentry.captureException(error, { extra: errorInfo })
    if (import.meta.env.DEV) {
      // Log only in development to aid debugging — never in production
      // console.error removed for code quality
    }
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

ScopedErrorBoundary.propTypes = {
  /** The component subtree to protect from rendering errors */
  children: PropTypes.node.isRequired,
};
