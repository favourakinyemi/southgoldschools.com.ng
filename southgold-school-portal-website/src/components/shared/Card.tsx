import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  clickable?: boolean;
  onClick?: () => void;
}

/**
 * Standard card container matching the new design system.
 * Used for grouping content with consistent styling.
 */
export default function Card({
  children,
  className = '',
  clickable = false,
  onClick
}: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-portal-border dark:border-slate-800 rounded-lg shadow-sm ${
        clickable ? 'cursor-pointer hover:border-portal-primary/50 hover:shadow-md transition-all' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
