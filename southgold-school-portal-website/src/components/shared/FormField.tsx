import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard form field wrapper for consistent form styling.
 * Wraps inputs, selects, textareas with label, validation, and helper text.
 */
export default function FormField({
  label,
  required = false,
  error,
  helperText,
  children,
  className = ''
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-sm font-semibold text-portal-heading dark:text-slate-200">
        {label}
        {required && <span className="text-portal-danger ml-1">*</span>}
      </label>
      <div className="relative">
        {children}
      </div>
      {error && (
        <p className="text-xs text-portal-danger dark:text-rose-400 font-medium mt-1">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-xs text-portal-muted dark:text-slate-400 mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
}
