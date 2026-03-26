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
    'flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

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
  );
};
