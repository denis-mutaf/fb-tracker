'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Bell, BellOff, Key, Clock, AlertTriangle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { useAccountStore } from '@/hooks/use-account'
import { AlertRule, METRIC_LABELS, MetricKey } from '@/types'
import { cn } from '@/lib/utils'

const METRIC_OPTIONS: MetricKey[] = ['cost_per_result', 'cpc', 'cpm', 'ctr', 'spend', 'results']
const OPERATOR_OPTIONS = [
  { value: 'above', label: 'выше' },
  { value: 'below', label: 'ниже' },
]

const TOKEN_CREATED_DATE = new Date('2026-02-05')
const TOKEN_LIFETIME_DAYS = 60

function TokenStatus() {
  const today = new Date()
  const expiresAt = new Date(TOKEN_CREATED_DATE)
  expiresAt.setDate(expiresAt.getDate() + TOKEN_LIFETIME_DAYS)
  const daysLeft = Math.ceil((expiresAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isExpiringSoon = daysLeft <= 14
  const isExpired = daysLeft <= 0

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg flex-shrink-0',
          isExpired ? 'bg-red-500/15' : isExpiringSoon ? 'bg-yellow-500/15' : 'bg-emerald-500/15'
        )}>
          <Key size={16} className={isExpired ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : 'text-emerald-400'} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Meta Access Token</h3>
            <div className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full',
              isExpired ? 'bg-red-500/15 text-red-400' :
              isExpiringSoon ? 'bg-yellow-500/15 text-yellow-400' :
              'bg-emerald-500/15 text-emerald-400'
            )}>
              <Clock size={10} />
              {isExpired
                ? 'Токен истёк'
                : `Истекает через ${daysLeft} дн.`
              }
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Создан: {TOKEN_CREATED_DATE.toLocaleDateString('ru-RU')} ·
            Истекает: {expiresAt.toLocaleDateString('ru-RU')}
          </p>
          {isExpiringSoon && !isExpired && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-yellow-400">
              <AlertTriangle size={11} />
              Обновите токен в Meta Developers до истечения срока
            </div>
          )}
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, (daysLeft / TOKEN_LIFETIME_DAYS) * 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                background: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#10b981',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { selectedAccount } = useAccountStore()
  const [rules, setRules] = useState<AlertRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)

  const [newRule, setNewRule] = useState({
    metric: 'cost_per_result' as MetricKey,
    operator: 'above' as 'above' | 'below',
    threshold: '',
    label: '',
  })

  const fetchRules = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/alerts?accountId=${selectedAccount.account_id}`)
      const data = await res.json()
      setRules(data.data || [])
    } catch { setRules([]) }
    finally { setIsLoading(false) }
  }, [selectedAccount.account_id])

  useEffect(() => { fetchRules() }, [fetchRules])

  async function handleCreate() {
    if (!newRule.threshold) return

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          account_id: selectedAccount.account_id,
          metric: newRule.metric,
          operator: newRule.operator,
          threshold: parseFloat(newRule.threshold),
          label: newRule.label || null,
        }),
      })
      const data = await res.json()
      if (data.data) {
        setRules((prev) => [data.data, ...prev])
        setNewRule({ metric: 'cost_per_result', operator: 'above', threshold: '', label: '' })
        setIsAdding(false)
      }
    } catch { /* handle error */ }
  }

  async function handleDelete(id: string) {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id, is_active: isActive }),
    })
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, is_active: isActive } : r))
  }

  const inputClass = cn(
    'px-3 py-2 rounded-lg text-sm text-slate-200 outline-none transition-all',
    'bg-white/5 border border-white/10 focus:border-blue-500/40'
  )

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Настройки" />

      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        <div>
          <h2 className="text-xl font-semibold text-white">Настройки</h2>
          <p className="text-sm text-slate-500 mt-0.5">Управление токенами и правилами алертов</p>
        </div>

        <TokenStatus />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Правила алертов</h3>
              <p className="text-xs text-slate-500 mt-0.5">Пороговые значения для AI-анализа</p>
            </div>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#3b82f6',
              }}>
              <Plus size={14} />
              Добавить
            </button>
          </div>

          <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="glass-card rounded-xl p-5 mb-4 overflow-hidden">
                <h4 className="text-sm font-medium text-white mb-4">Новое правило</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">Метрика</label>
                    <select
                      value={newRule.metric}
                      onChange={(e) => setNewRule({ ...newRule, metric: e.target.value as MetricKey })}
                      className={inputClass + ' w-full appearance-none cursor-pointer'}>
                      {METRIC_OPTIONS.map((m) => (
                        <option key={m} value={m} style={{ background: '#1a1a26' }}>
                          {METRIC_LABELS[m]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">Оператор</label>
                    <select
                      value={newRule.operator}
                      onChange={(e) => setNewRule({ ...newRule, operator: e.target.value as 'above' | 'below' })}
                      className={inputClass + ' w-full appearance-none cursor-pointer'}>
                      {OPERATOR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} style={{ background: '#1a1a26' }}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">Пороговое значение</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRule.threshold}
                      onChange={(e) => setNewRule({ ...newRule, threshold: e.target.value })}
                      placeholder="Например: 5.00"
                      className={inputClass + ' w-full font-mono'}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">Описание (опционально)</label>
                    <input
                      type="text"
                      value={newRule.label}
                      onChange={(e) => setNewRule({ ...newRule, label: e.target.value })}
                      placeholder="Цена лида выше нормы"
                      className={inputClass + ' w-full'}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={handleCreate}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                    style={{ background: '#3b82f6' }}>
                    Создать правило
                  </button>
                  <button
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    Отмена
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card rounded-xl p-4 h-20 animate-pulse" />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div className="glass-card rounded-xl p-10 text-center">
              <Bell size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Нет правил алертов</p>
              <p className="text-slate-600 text-xs mt-1">Создайте правила для автоматического контроля метрик</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {rules.map((rule, i) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      'glass-card rounded-xl p-4 flex items-center gap-4 transition-all',
                      !rule.is_active && 'opacity-50'
                    )}>
                    <div className={cn(
                      'p-2 rounded-lg flex-shrink-0',
                      rule.is_active ? 'bg-red-500/15' : 'bg-slate-800'
                    )}>
                      {rule.is_active
                        ? <Bell size={14} className="text-red-400" />
                        : <BellOff size={14} className="text-slate-600" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">
                          {rule.label || `${METRIC_LABELS[rule.metric as MetricKey]} ${rule.operator === 'above' ? 'выше' : 'ниже'} ${rule.threshold}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                        <span className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          {METRIC_LABELS[rule.metric as MetricKey]}
                        </span>
                        <span>{rule.operator === 'above' ? '>' : '<'}</span>
                        <span className="font-mono text-slate-300">{rule.threshold}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(rule.id, !rule.is_active)}
                        className={cn(
                          'relative w-10 h-5.5 rounded-full transition-all',
                          'flex items-center'
                        )}
                        style={{
                          background: rule.is_active ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.1)',
                          border: `1px solid ${rule.is_active ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.15)'}`,
                          padding: '2px',
                        }}>
                        <motion.div
                          animate={{ x: rule.is_active ? 18 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="w-4 h-4 rounded-full"
                          style={{ background: rule.is_active ? '#3b82f6' : '#64748b' }}
                        />
                      </button>

                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">SQL для создания таблиц</h3>
          <p className="text-xs text-slate-500 mb-3">Выполните в Supabase SQL Editor для инициализации БД:</p>
          <pre className="text-xs text-slate-400 overflow-x-auto leading-relaxed p-4 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.3)', fontFamily: 'JetBrains Mono, monospace' }}>
{`-- meta_ad_accounts
create table meta_ad_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id text unique not null,
  account_name text not null,
  account_currency text default 'USD',
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into meta_ad_accounts (account_id, account_name) values
  ('act_1478794733204244', 'Anver Textil'),
  ('act_1160997135477649', 'Denis Cosarnii');

-- meta_campaign_insights
create table meta_campaign_insights (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references meta_ad_accounts(account_id),
  campaign_id text,
  campaign_name text not null,
  date date not null,
  spend numeric default 0,
  impressions integer default 0,
  clicks integer default 0,
  results integer default 0,
  cost_per_result numeric default 0,
  cpm numeric default 0,
  cpc numeric default 0,
  ctr numeric default 0,
  account_currency text default 'USD',
  fetched_at timestamptz default now(),
  unique(account_id, campaign_name, date)
);

-- alert_rules
create table alert_rules (
  id uuid primary key default gen_random_uuid(),
  account_id text references meta_ad_accounts(account_id),
  metric text not null,
  operator text not null,
  threshold numeric not null,
  label text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ai_reports
create table ai_reports (
  id uuid primary key default gen_random_uuid(),
  account_id text references meta_ad_accounts(account_id),
  report_date date not null,
  report_text text not null,
  alerts jsonb default '[]',
  created_at timestamptz default now()
);`}
          </pre>
        </div>
      </div>
    </div>
  )
}
