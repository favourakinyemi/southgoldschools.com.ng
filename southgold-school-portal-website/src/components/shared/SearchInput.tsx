import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Consistent search input component with clear button.
 */
export default function SearchInput({
  placeholder = 'Search...',
  value,
  onChange,
  onClear,
  className = '',
  autoFocus = false
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-portal-muted dark:text-slate-500 pointer-events-none">
        <Search size={18} />
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="w-full pl-10 pr-10 py-2.5 border border-portal-border dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950 text-portal-heading dark:text-slate-100 placeholder-portal-muted dark:placeholder-slate-500 focus:border-portal-primary focus:ring-1 focus:ring-portal-focus dark:focus:border-portal-primary transition-colors"
      />
      {value && (
        <button
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-portal-muted dark:text-slate-500 hover:text-portal-heading dark:hover:text-slate-300 transition-colors"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
