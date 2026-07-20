import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { DashboardAlert } from '@/types/dashboard'
import { toast } from '@/hooks/use-toast'

interface Props {
  alert: DashboardAlert
  onResolve: (id: string, action: DashboardAlert['action']) => Promise<void>
}

const severityBar = {
  critical: 'bg-red-500',
  warning: 'bg-amber-400',
  info: 'bg-blue-400',
}

const actionStyles: Record<DashboardAlert['action']['kind'], string> = {
  schedule: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600',
  immobilize: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600',
  book: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-500 hover:text-white hover:border-amber-500',
  order: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-500 hover:text-white hover:border-blue-500',
  plan: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-500 hover:text-white hover:border-blue-500',
}

export function AlertRow({ alert, onResolve }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  async function handleAction() {
    setState('loading')
    try {
      await onResolve(alert.id, alert.action)
      setState('done')
    } catch {
      setState('idle')
      toast({
        title: 'Action indisponible',
        description: "Impossible de traiter cette alerte pour le moment. Veuillez reessayer.",
        variant: 'destructive',
      })
    }
  }

  const timeAgo = formatDistanceToNow(new Date(alert.createdAt), {
    addSuffix: true,
    locale: fr,
  })

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-surface-raised last:border-0',
        'hover:bg-surface-raised transition-colors group',
        state === 'done' && 'opacity-40 pointer-events-none'
      )}
    >
      <div className={cn('w-0.5 h-8 rounded-full flex-shrink-0', severityBar[alert.severity])} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
          {alert.plate} · {alert.vehicleName}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{alert.message}</p>
      </div>

      <span className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">
        {timeAgo}
      </span>

      <button
        onClick={handleAction}
        disabled={state !== 'idle'}
        className={cn(
          'flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border transition-all',
          actionStyles[alert.action.kind],
          state === 'loading' && 'opacity-60 cursor-not-allowed',
          state === 'done' && 'bg-emerald-50 text-emerald-700 border-emerald-200'
        )}
      >
        {state === 'loading' && '…'}
        {state === 'done' && '✓ Traité'}
        {state === 'idle' && alert.action.label}
      </button>
    </div>
  )
}
