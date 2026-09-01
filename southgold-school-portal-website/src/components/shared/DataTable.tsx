import React from 'react';

interface DataTableProps {
  children: React.ReactNode;
  className?: string;
}

export default function DataTable({ children, className = '' }: DataTableProps) {
  return (
    <div className={`overflow-hidden rounded-lg border border-portal-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
