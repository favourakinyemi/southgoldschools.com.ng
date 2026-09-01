import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'default' | 'primary' | 'danger';
}

export default function IconButton({
  label,
  children,
  className = '',
  variant = 'default',
  type = 'button',
  ...props
}: IconButtonProps) {
  const variants = {
    default: 'text-portal-muted hover:text-portal-heading hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800',
    primary: 'text-portal-primary hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30',
    danger: 'text-slate-400 hover:text-portal-danger hover:bg-red-50 dark:hover:bg-red-950/30'
  };

  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
