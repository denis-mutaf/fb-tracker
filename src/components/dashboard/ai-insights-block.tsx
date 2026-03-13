'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, RefreshCw, AlertTriangle, ChevronRight, CheckCircle } from 'lucide-react'
import { useAccountStore } from '@/hooks/use-account'
import { AlertFired } from '@/types'
import { cn } from '@/lib/utils'

interface AiInsightsBlockProps {
  dateFrom: string
  dateTo: string
}

export function AiInsightsBlock({ dateFrom, dateTo }: AiInsightsBlockProps) {
  const { selectedAccount } = useAccountStore()
  const [isLoading, setIsLoading] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<AlertFired[]>([])
  const [question, setQuestion] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function fetchAnalysis() {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount.account_id,
          dateFrom,
          dateTo,
          question: question || undefined,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setReport(data.report)
        setAlerts(data.alerts || [])
      } else {
        setError(data.error || 'Ошибка при анализе')
      }
    } catch {
      setError('Не удалось выполнить анализ')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
            <Brain size={16} style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Аналитика</h3>
            <p className="text-xs text-slate-500">GPT-4o анализ кампаний</p>
          </div>
        </div>
        <button
          onClick={fetchAnalysis}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            color: '#8b5cf6',
          }}>
          <RefreshCw size={13} className={cn(isLoading && 'spin-slow')} />
          {isLoading ? 'Анализирую...' : 'Запросить анализ'}
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Задать конкретный вопрос (опционально)..."
          className="w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 placeholder-slate-600 outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(139, 92, 246, 0.4)' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.07)' }}
        />
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg text-sm text-red-400"
            style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            <AlertTriangle size={14} />
            {error}
          </motion.div>
        )}

        {!report && !error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Brain size={32} className="text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">Нажмите "Запросить анализ" для получения AI-отчёта</p>
            <p className="text-slate-600 text-xs mt-1">Данные за {dateFrom} — {dateTo}</p>
          </div>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 spin-slow mb-3" />
            <p className="text-slate-500 text-sm">GPT-4o анализирует данные...</p>
          </motion.div>
        )}

        {report && !isLoading && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4">
            {alerts.length > 0 && (
              <div className="rounded-lg p-4 space-y-2" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div className="flex items-center gap-2 text-sm font-medium text-red-400 mb-2">
                  <AlertTriangle size={14} />
                  Сработавшие алерты ({alerts.length})
                </div>
                {alerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <ChevronRight size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>{alert.campaign_name}</strong> — {alert.label}:
                      {' '}факт <span className="text-red-400 font-mono">{alert.actual_value}</span>
                      {' '}(порог <span className="font-mono">{alert.threshold}</span>)
                    </span>
                  </div>
                ))}
              </div>
            )}

            {alerts.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 py-2">
                <CheckCircle size={12} />
                Все метрики в норме
              </div>
            )}

            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {report}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
