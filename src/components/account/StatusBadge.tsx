/**
 * Badge de statut d'abonnement — compact, coloré, avec icône.
 */

import {
  CheckCircle2, Sparkles, CreditCard, Clock,
  Ban, AlertCircle, XCircle,
} from 'lucide-react';
import { STATUS_DISPLAY } from '@/types/account-status';
import type { SubscriptionStatus } from '@/types/account-status';

const ICONS = {
  CheckCircle2,
  Sparkles,
  CreditCard,
  Clock,
  Ban,
  AlertCircle,
  XCircle,
} as const;

interface StatusBadgeProps {
  status:    SubscriptionStatus;
  size?:     'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const display = STATUS_DISPLAY[status];
  const Icon    = ICONS[display.icon as keyof typeof ICONS];

  const sizeClass = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  const iconSize = size === 'lg' ? 'h-4 w-4' : 'h-3 w-3';

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${display.color} ${display.textColor} ${display.borderColor}
        ${sizeClass} ${className}
      `}
      role="status"
    >
      <Icon className={iconSize} aria-hidden />
      {display.label}
    </span>
  );
}
