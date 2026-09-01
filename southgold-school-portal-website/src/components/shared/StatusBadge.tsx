import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'pending' | 'approved' | 'rejected' | 'published' | 'draft';
  className?: string;
}

/**
 * Consistent status badge component for academic and operational statuses.
 */
export default function StatusBadge({
  status,
  variant = 'default',
  className = ''
}: StatusBadgeProps) {
  const variantClasses: Record<string, string> = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    success: 'bg-emerald-100 dark:bg-emerald-950/30 text-portal-success dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-950/30 text-portal-warning dark:text-amber-400',
    danger: 'bg-rose-100 dark:bg-rose-950/30 text-portal-danger dark:text-rose-400',
    info: 'bg-blue-100 dark:bg-blue-950/30 text-portal-primary dark:text-blue-400',
    pending: 'bg-amber-100 dark:bg-amber-950/30 text-portal-warning dark:text-amber-400',
    approved: 'bg-emerald-100 dark:bg-emerald-950/30 text-portal-success dark:text-emerald-400',
    rejected: 'bg-rose-100 dark:bg-rose-950/30 text-portal-danger dark:text-rose-400',
    published: 'bg-blue-100 dark:bg-blue-950/30 text-portal-primary dark:text-blue-400',
    draft: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
  };

  // Auto-detect variant from status if not explicitly provided
  let effectiveVariant = variant;
  if (variant === 'default') {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('active') || statusLower.includes('present')) {
      effectiveVariant = 'success';
    } else if (statusLower.includes('absent') || statusLower.includes('fail')) {
      effectiveVariant = 'danger';
    } else if (statusLower.includes('pending') || statusLower.includes('late')) {
      effectiveVariant = 'pending';
    } else if (statusLower.includes('approved') || statusLower.includes('excellent')) {
      effectiveVariant = 'approved';
    } else if (statusLower.includes('published')) {
      effectiveVariant = 'published';
    } else if (statusLower.includes('draft')) {
      effectiveVariant = 'draft';
    } else if (statusLower.includes('rejected')) {
      effectiveVariant = 'rejected';
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${variantClasses[effectiveVariant]} ${className}`}>
      {status}
    </span>
  );
}
