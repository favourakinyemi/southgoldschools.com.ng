import React from 'react';
import { ArrowRight } from 'lucide-react';

interface QuickActionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

export default function QuickAction({ title, description, icon, onClick }: QuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-portal-border bg-white p-4 text-left shadow-sm transition-colors hover:border-portal-primary/60 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
    >
      <span className="flex items-center gap-3">
        {icon && <span className="text-portal-primary dark:text-blue-300">{icon}</span>}
        <span>
          <span className="block text-sm font-bold text-portal-heading dark:text-slate-100">{title}</span>
          {description && <span className="mt-0.5 block text-xs text-portal-muted dark:text-slate-400">{description}</span>}
        </span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-portal-muted" />
    </button>
  );
}
