import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

/**
 * Section header component for grouping content within pages.
 * Used for subsections, card titles, and logical groupings.
 */
export default function SectionHeader({
  title,
  subtitle,
  icon,
  className = '',
  action
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        {icon && (
          <div className="text-portal-primary dark:text-blue-400">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-bold text-base text-portal-heading dark:text-slate-100 flex items-center gap-2">
            {title}
          </h3>
          {subtitle && (
            <p className="text-portal-muted dark:text-slate-400 text-xs mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
