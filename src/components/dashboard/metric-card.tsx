'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string
  change?: number
  icon: React.ReactNode
  index?: number
  suffix?: string
  isPositiveWhenUp?: boolean
}

export function MetricCard({
  title,
  value,
  change,
  icon,
  index = 0,
  isPositiveWhenUp = true,
}: MetricCardProps) {
  const hasChange = change !== undefined && change !== null
  const isPositive = hasChange && (isPositiveWhenUp ? change > 0 : change < 0)
  const isNeutral = !hasChange || change === 0
  const changeAbs = hasChange ? Math.abs(change) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      className="glass-card rounded-xl p-5 relative overflow-hidden group transition-all duration-300">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.05), transparent 70%)' }} />

      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {icon}
        </div>
        {hasChange && (
          <div className={cn(
            'flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium',
            isNeutral
              ? 'bg-slate-500/10 text-slate-400'
              : isPositive
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-red-500/10 text-red-400'
          )}>
            {isNeutral ? (
              <Minus size={11} />
            ) : isPositive ? (
              <TrendingUp size={11} />
            ) : (
              <TrendingDown size={11} />
            )}
            {changeAbs.toFixed(1)}%
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-white font-mono leading-none">{value}</p>
      </div>
    </motion.div>
  )
}
