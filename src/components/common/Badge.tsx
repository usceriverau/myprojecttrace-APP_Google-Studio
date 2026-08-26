import React from 'react';
import { cn } from '../../lib/utils';
import { AlertSeverity, ProjectStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'critical' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className,
}) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    critical: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
  };

  const sizeStyles = {
    sm: 'text-xs sm:text-[13px] px-2.5 py-0.5 font-bold',
    md: 'text-sm sm:text-base px-3 py-1 font-bold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-medium whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success">Active</Badge>;
    case 'COMPLETED':
      return <Badge variant="neutral">Completed</Badge>;
    case 'ON_HOLD':
      return <Badge variant="warning">On Hold</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

export const SeverityBadge: React.FC<{ severity: AlertSeverity }> = ({ severity }) => {
  switch (severity) {
    case 'CRITICAL':
      return <Badge variant="critical">Critical Risk</Badge>;
    case 'WARNING':
      return <Badge variant="warning">Warning</Badge>;
    case 'INFO':
      return <Badge variant="info">Note</Badge>;
    default:
      return <Badge variant="default">{severity}</Badge>;
  }
};
