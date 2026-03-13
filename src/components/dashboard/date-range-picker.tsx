'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'

interface DateRange {
  from: string
  to: string
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

const presets = [
  { label: '7 дней', days: 7 },
  { label: '14 дней', days: 14 },
  { label: '30 дней', days: 30 },
  { label: '90 дней', days: 90 },
]

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  function applyPreset(days: number) {
    const to = format(new Date(), 'yyyy-MM-dd')
    const from = format(subDays(new Date(), days), 'yyyy-MM-dd')
    onChange({ from, to })
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#94a3b8',
        }}>
        <CalendarDays size={14} />
        <span>{value.from} — {value.to}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 rounded-xl p-4 min-w-[280px]"
            style={{
              background: '#1a1a26',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}>
            <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Быстрый выбор</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {presets.map((p) => (
                <button
                  key={p.days}
                  onClick={() => applyPreset(p.days)}
                  className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Произвольный период</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={value.from}
                  onChange={(e) => onChange({ ...value, from: e.target.value })}
                  className={cn(
                    'flex-1 px-2 py-1.5 rounded-lg text-xs text-slate-300',
                    'bg-white/5 border border-white/10 outline-none focus:border-blue-500/50'
                  )}
                />
                <span className="text-slate-600 text-xs">—</span>
                <input
                  type="date"
                  value={value.to}
                  onChange={(e) => onChange({ ...value, to: e.target.value })}
                  className={cn(
                    'flex-1 px-2 py-1.5 rounded-lg text-xs text-slate-300',
                    'bg-white/5 border border-white/10 outline-none focus:border-blue-500/50'
                  )}
                />
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                Применить
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
