'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { format, subDays } from 'date-fns'
import { parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronRight } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Header } from '@/components/layout/header'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { CampaignsBreadcrumbs } from '@/components/campaigns/breadcrumbs'
import { useAccountStore } from '@/hooks/use-account'
import { CampaignInsight } from '@/types'
import { formatCurrency, formatNumber, formatPercent, cn } from '@/lib/utils'
import type { AdsetAggregateRow } from '@/app/api/meta/adsets/route'

const tooltipStyle = {
  backgroundColor: '#1a1a26',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#f1f5f9',
  fontSize: '12px',
}

const formatChartDate = (date: unknown) => {
  try {
    return format(parseISO(String(date)), 'd MMM', { locale: ru })
  } catch {
    return String(date)
  }
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const campaignId = String(params.campaignId ?? '')
  const dateFrom = searchParams.get('dateFrom') || format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const dateTo = searchParams.get('dateTo') || format(new Date(), 'yyyy-MM-dd')

  const { selectedAccount } = useAccountStore()
  const [campaignName, setCampaignName] = useState<string>('')
  const [dailyInsights, setDailyInsights] = useState<CampaignInsight[]>([])
  const [adsets, setAdsets] = useState<AdsetAggregateRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const dateRange = { from: dateFrom, to: dateTo }

  const setDateRangeAndSyncUrl = useCallback(
    (range: { from: string; to: string }) => {
      const q = new URLSearchParams(searchParams.toString())
      q.set('dateFrom', range.from)
      q.set('dateTo', range.to)
      router.replace(`${pathname}?${q.toString()}`)
    },
    [pathname, router, searchParams]
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const [insightsRes, adsetsRes] = await Promise.all([
          fetch(
            `/api/meta/insights?accountId=${selectedAccount.account_id}&campaignId=${encodeURIComponent(campaignId)}&dateFrom=${dateFrom}&dateTo=${dateTo}`
          ).then((r) => r.json()),
          fetch(
            `/api/meta/adsets?accountId=${selectedAccount.account_id}&campaignId=${encodeURIComponent(campaignId)}&dateFrom=${dateFrom}&dateTo=${dateTo}&groupBy=adset`
          ).then((r) => r.json()),
        ])

        if (cancelled) return

        const insights: CampaignInsight[] = insightsRes.data ?? []
        const adsetList: AdsetAggregateRow[] = adsetsRes.data ?? []

        setDailyInsights(insights)
        setAdsets(adsetList)
        if (insights.length > 0) {
          setCampaignName(insights[0].campaign_name)
        } else if (adsetList.length > 0) {
          setCampaignName(adsetList[0].campaign_name)
        } else {
          setCampaignName(decodeURIComponent(campaignId))
        }
      } catch {
        setDailyInsights([])
        setAdsets([])
        setCampaignName(decodeURIComponent(campaignId))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [selectedAccount.account_id, campaignId, dateFrom, dateTo])

  const totals = {
    spend: dailyInsights.reduce((s, r) => s + r.spend, 0),
    reach: dailyInsights.reduce((s, r) => s + (r.reach ?? 0), 0),
    impressions: dailyInsights.reduce((s, r) => s + r.impressions, 0),
    frequency: dailyInsights.length
      ? dailyInsights.reduce((s, r) => s + (r.frequency ?? 0), 0) / dailyInsights.length
      : 0,
    clicks: dailyInsights.reduce((s, r) => s + r.clicks, 0),
    results: dailyInsights.reduce((s, r) => s + r.results, 0),
    ctr: dailyInsights.length
      ? dailyInsights.reduce((s, r) => s + r.ctr, 0) / dailyInsights.length
      : 0,
    cpc: dailyInsights.length ? dailyInsights.reduce((s, r) => s + r.cpc, 0) / dailyInsights.length : 0,
    costPerResult: 0 as number,
  }
  totals.costPerResult = totals.results > 0 ? totals.spend / totals.results : 0

  const spendByDay = [...dailyInsights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: r.date, spend: Math.round(r.spend * 100) / 100 }))

  const breadcrumbItems = [
    { label: 'Кампании', href: '/campaigns' },
    { label: campaignName || '…', href: undefined },
  ]
  const queryParams = { dateFrom, dateTo }

  const basePath = `/campaigns/${campaignId}`

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Кампании" />

      <div className="flex-1 p-6 space-y-6">
        <CampaignsBreadcrumbs items={breadcrumbItems} searchParams={queryParams} />

        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-white truncate max-w-full">
            {isLoading ? '…' : campaignName || 'Кампания'}
          </h1>
          <DateRangePicker value={dateRange} onChange={setDateRangeAndSyncUrl} />
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-[220px] rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <div className="h-[220px] rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="h-12 border-b border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }} />
              <div className="divide-y divide-white/5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <div className="h-4 w-32 rounded animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="h-4 w-16 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <div className="h-4 w-20 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <div className="h-4 w-14 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
              <MetricCard label="Расход" value={formatCurrency(totals.spend)} />
              <MetricCard label="Охват" value={formatNumber(totals.reach)} />
              <MetricCard label="Показы" value={formatNumber(totals.impressions)} />
              <MetricCard label="Частота" value={totals.frequency.toFixed(2)} highlight={totals.frequency > 3} />
              <MetricCard label="Клики" value={formatNumber(totals.clicks)} />
              <MetricCard label="Результаты" value={formatNumber(totals.results)} />
              <MetricCard label="CTR" value={formatPercent(totals.ctr)} />
              <MetricCard label="CPC" value={formatCurrency(totals.cpc)} />
              <MetricCard label="Цена/рез." value={formatCurrency(totals.costPerResult)} />
            </div>

            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Расход по дням</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={spendByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="campSpendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Расход']} labelFormatter={formatChartDate} />
                  <Area type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} fill="url(#campSpendGrad)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <h2 className="text-lg font-semibold text-white px-4 py-3">Адсеты</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <th className="px-4 py-3 text-left text-slate-500 font-medium">Адсет</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-medium">Расход</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-medium">Показы</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-medium">Охват</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-medium">Частота</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-medium">Клики</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-medium">Рез-ты</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-medium">CTR</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-medium">CPC</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-medium">Цена/рез</th>
                      <th className="px-4 py-3 w-10" aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {adsets.map((row, i) => {
                      const adsetId = row.adset_id ?? encodeURIComponent(row.adset_name)
                      const href = `${basePath}/${adsetId}?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`
                      const freqHighlight = row.avg_frequency > 3.0

                      return (
                        <motion.tr
                          key={row.adset_name}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(href)}
                          onKeyDown={(e) => e.key === 'Enter' && router.push(href)}
                          className="cursor-pointer transition-colors duration-150 group"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <td className="px-4 py-3 font-medium text-slate-200 max-w-[220px] truncate">{row.adset_name}</td>
                          <td className="px-4 py-3 font-mono text-slate-300">{formatCurrency(row.total_spend)}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{formatNumber(row.total_impressions)}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{formatNumber(row.total_reach)}</td>
                          <td className={cn('px-4 py-3 font-mono', freqHighlight && 'text-red-400')}>{row.avg_frequency.toFixed(2)}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{formatNumber(row.total_clicks)}</td>
                          <td className="px-4 py-3 font-mono text-slate-300">{formatNumber(row.total_results)}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{formatPercent(row.avg_ctr)}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{formatCurrency(row.avg_cpc)}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{formatCurrency(row.avg_cost_per_result)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex text-slate-500 group-hover:text-white transition-colors">
                              <ChevronRight size={16} />
                            </span>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
                {!isLoading && adsets.length === 0 && (
                  <div className="min-h-[300px] flex items-center justify-center text-slate-500 text-sm">Нет адсетов за выбранный период</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-0.5"
      style={{
        background: highlight ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
        border: highlight ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span className={cn('text-[10px] font-medium uppercase tracking-wide', highlight ? 'text-red-400' : 'text-slate-500')}>
        {label}
      </span>
      <span className={cn('text-sm font-semibold font-mono leading-tight', highlight ? 'text-red-300' : 'text-white')}>
        {value}
      </span>
    </div>
  )
}
