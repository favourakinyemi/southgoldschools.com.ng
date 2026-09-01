import React from 'react';

interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

export default function Tabs<T extends string>({ items, active, onChange, className = '' }: TabsProps<T>) {
  return (
    <div className={`flex flex-wrap gap-1 rounded-lg border border-portal-border bg-white p-1 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-bold transition-colors ${
            active === item.id
              ? 'bg-portal-primary text-white shadow-sm'
              : 'text-portal-muted hover:bg-portal-elevated hover:text-portal-heading dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
          }`}
        >
          {item.icon}
          {item.label}
          {typeof item.count === 'number' && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
