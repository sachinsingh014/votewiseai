import PropTypes from 'prop-types';

/**
 * @fileoverview Skeleton screen components for route-level lazy loading.
 * @module components/SkeletonScreens
 *
 * These match the physical layout of their respective pages to prevent
 * Cumulative Layout Shift (CLS) during Suspense fallback rendering.
 *
 * Design rule: every skeleton block uses `animate-pulse` and matches
 * the exact padding, height, and position of the real content block.
 */

/**
 * Reusable animated shimmer bar — thin horizontal placeholder line.
 *
 * @param {Object} props - Component props
 * @param {string} props.className - Tailwind class string for sizing and color
 * @returns {JSX.Element} Animated pulse bar element
 */
const Bar = ({ className }) => (
  <div className={`bg-slate-200 rounded-lg animate-pulse ${className}`} />
);

Bar.propTypes = {
  /** Tailwind CSS classes for width, height, and custom color overrides */
  className: PropTypes.string.isRequired,
};

/**
 * Reusable animated shimmer block — larger rectangular placeholder area.
 *
 * @param {Object} props - Component props
 * @param {string} props.className - Tailwind class string for sizing and color
 * @returns {JSX.Element} Animated pulse block element
 */
const Block = ({ className }) => (
  <div className={`bg-slate-100 rounded-xl animate-pulse ${className}`} />
);

Block.propTypes = {
  /** Tailwind CSS classes for width, height, and custom color overrides */
  className: PropTypes.string.isRequired,
};

/**
 * Skeleton for the Dashboard / Voting Guide page.
 * Mirrors the navbar, progress header, and step card layout.
 *
 * @returns {JSX.Element} Full-page dashboard skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen pearl-bg font-inter" aria-hidden="true" aria-label="Loading dashboard">
      {/* Top App Bar */}
      <div className="top-app-bar-bg h-14 flex items-center px-6 gap-4">
        <Bar className="w-32 h-5 bg-slate-600" />
        <div className="ml-auto flex gap-3">
          <Bar className="w-24 h-8 bg-slate-600 rounded-xl" />
          <Bar className="w-8 h-8 bg-slate-600 rounded-full" />
        </div>
      </div>
      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Progress header */}
        <Block className="h-28 w-full" />
        {/* Step cards */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 card-shadow flex gap-4">
            <Block className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Bar className="h-4 w-1/3" />
              <Bar className="h-3 w-2/3" />
            </div>
            <Bar className="w-24 h-8 rounded-xl flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for the Chat Interface page.
 * Mirrors the sidebar and chat message layout.
 *
 * @returns {JSX.Element} Full-page chat skeleton
 */
export function ChatSkeleton() {
  return (
    <div className="flex h-screen bg-slate-50 font-inter" aria-hidden="true" aria-label="Loading chat">
      {/* Sidebar (desktop only) */}
      <div className="hidden md:flex flex-col w-72 bg-slate-900 p-4 gap-3">
        <Bar className="h-8 w-36 bg-slate-700" />
        <Bar className="h-10 w-full bg-slate-700 rounded-xl mt-2" />
        <div className="space-y-2 mt-4">
          {[1, 2, 3].map((i) => (
            <Bar key={i} className="h-8 w-full bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="top-app-bar-bg h-14" />
        <div className="flex-1 p-6 space-y-4">
          {/* AI message */}
          <div className="flex items-end gap-3">
            <Block className="w-8 h-8 rounded-full flex-shrink-0" />
            <Block className="h-16 w-64 rounded-2xl" />
          </div>
          {/* User message */}
          <div className="flex items-end gap-3 justify-end">
            <Block className="h-10 w-48 rounded-2xl" />
          </div>
          {/* AI message */}
          <div className="flex items-end gap-3">
            <Block className="w-8 h-8 rounded-full flex-shrink-0" />
            <Block className="h-20 w-72 rounded-2xl" />
          </div>
        </div>
        <div className="bg-white border-t border-slate-200 p-4">
          <Block className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for the Auth / Login page.
 * Mirrors the centered auth card layout.
 *
 * @returns {JSX.Element} Full-page auth skeleton
 */
export function AuthSkeleton() {
  return (
    <div className="min-h-screen pearl-bg flex items-center justify-center font-inter" aria-hidden="true">
      <div className="w-full max-w-md px-4">
        <Block className="h-96 w-full rounded-2xl" />
      </div>
    </div>
  );
}
