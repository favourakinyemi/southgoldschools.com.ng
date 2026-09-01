import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Consistent empty state component used across all pages.
 * Provides clear messaging when no data is available.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`rounded-lg border border-dashed border-portal-border dark:border-slate-800 bg-portal-elevated dark:bg-slate-950/40 p-8 text-center ${className}`}>
      <div className="flex justify-center mb-3">
        <div className="text-slate-400">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-sm font-bold text-portal-heading dark:text-slate-100">
        {title}
      </p>
      {description && (
        <p className="mt-1 text-xs text-portal-muted dark:text-slate-400 leading-5">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
