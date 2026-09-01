import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Standardized modal component with consistent styling and behavior.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions,
  size = 'md',
  className = ''
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center p-4 z-50">
      <div
        className={`bg-white dark:bg-slate-900 rounded-lg shadow-lg ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto ${className}`}
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="border-b border-portal-border dark:border-slate-800 p-6 flex items-start justify-between">
          <div>
            <h2 id="modal-title" className="text-xl font-bold text-portal-heading dark:text-white">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-portal-muted dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-portal-muted dark:text-slate-500 hover:text-portal-heading dark:hover:text-slate-300 transition-colors flex-shrink-0"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Modal Actions */}
        {actions && (
          <div className="border-t border-portal-border dark:border-slate-800 p-6 flex items-center justify-end gap-3 bg-portal-elevated dark:bg-slate-950/40">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
