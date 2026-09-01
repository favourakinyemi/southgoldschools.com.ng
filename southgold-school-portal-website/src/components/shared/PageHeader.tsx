import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Standard page header component used across all authenticated portal pages.
 * Provides consistent visual hierarchy and action placement.
 */
export default function PageHeader({
  title,
  description,
  actions,
  icon,
  className = ''
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-1 p-2 bg-blue-50 text-portal-primary dark:bg-blue-950/30 dark:text-blue-300 rounded-lg">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-portal-heading dark:text-white tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-portal-muted dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
