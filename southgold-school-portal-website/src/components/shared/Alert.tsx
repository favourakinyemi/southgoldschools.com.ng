import React from 'react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export default function Alert({ children, variant = 'neutral', icon, className = '' }: AlertProps) {
  const variants = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
    warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50',
    danger: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50',
    info: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50',
    neutral: 'bg-white text-portal-heading border-portal-border dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800'
  };

  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3.5 text-xs font-semibold shadow-sm ${variants[variant]} ${className}`}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}
