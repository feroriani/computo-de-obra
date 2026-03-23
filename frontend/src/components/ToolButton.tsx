import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'emerald' | 'danger';
  disabled?: boolean;
  showLabel?: boolean;
  title?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const ToolButton = ({
  icon: Icon,
  label,
  onClick,
  variant = 'secondary',
  disabled = false,
  showLabel = false,
  title,
  className = '',
  type = 'button',
}: ToolButtonProps) => {
  const baseStyles =
    'flex items-center justify-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-primary text-white hover:bg-primary-dark focus:ring-primary dark:bg-teal-600 dark:hover:bg-teal-700',
    emerald:
      'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    secondary:
      'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600',
    ghost:
      'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:ring-slate-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
  };

  return (
    <div className="group relative inline-flex">
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${baseStyles} ${variants[variant]} ${className}`}
        title={showLabel ? undefined : (title || label)}
      >
        <Icon size={18} className="shrink-0" />
        {showLabel && <span>{label}</span>}
      </button>

      {/* Tooltip simple con Tailwind */}
      {!showLabel && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 dark:bg-slate-800 border border-slate-700 shadow-lg">
          {title || label}
          {/* Flecha del tooltip */}
          <div className="absolute top-full left-1/2 -mt-1 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
};
