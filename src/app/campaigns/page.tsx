'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { format, subDays } from 'date-fns'
import { ChevronUp, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { useAccountStore } from '@/hooks/use-account'
import { CampaignInsight, AlertRule } from '@/types'
import { formatCurrency, formatNumber, formatPercent, cn } from '@/lib/utils'

type SortKey = 'campaign_name' | 'total_spend' | 'total_impressions' | 'total_clicks' | 'total_results' | 'avg_cpc' | 'avg_ctr' | 'avg_cost_per_result'
type SortDir = 'asc' | 'desc'

interface CampaignRow {
  campaign_name: string
  campaign_id: string | null
  total_spend: number
  total_impressions: number
  total_clicks: number
  total_results: number
  avg_cpm: number
  avg_cpc: number
  avg_ctr: number
  avg_cost_per_result: number
  days: number
}

function isCampaignAlerting(campaign: CampaignRow, rules: AlertRule[]): boolean {
  const metricMap: Record<string, number> = {
    cost_per_result: campaign.avg_cost_per_result,
    cpc: campaign.avg_cpc,
    cpm: campaign.avg_cpm,
    ctr: campaign.avg_ctr,
    spend: campaign.total_spend,
    results: campaign.total_results,
  }

  return rules.some((rule) => {
    if (!rule.is_active) return false
    const val = metricMap[rule.metric]
    return rule.operator === 'above' ? val > rule.threshold : val < rule.threshold
  })
}

function useDateRangeFromUrl() {
  const searchParams = useSearchParams()
  const from = searchParams.get('dateFrom') || format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const to = searchParams.get('dateTo') || format(new Date(), 'yyyy-MM-dd')
  return { from, to }
}

function CampaignsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const { selectedAccount } = useAccountStore()
  const urlRange = useDateRangeFromUrl()
  const [dateRange, setDateRange] = useState(urlRange)

  const setDateRangeAndSyncUrl = useCallback(
    (range: { from: string; to: string }) => {
      setDateRange(range)
      router.replace(`${pathname}?dateFrom=${encodeURIComponent(range.from)}&dateTo=${encodeURIComponent(range.to)}`)
    },
    [pathname, router]
  )
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [allInsights, setAllInsights] = useState<CampaignInsight[]>([])
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('total_spend')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [campaignsRes, insightsRes, alertsRes] = await Promise.all([
        fetch(`/api/meta/insights?accountId=${selectedAccount.account_id}&dateFrom=${dateRange.from}&dateTo=${dateRange.to}&groupBy=campaign`).then((r) => r.json()),
        fetch(`/api/meta/insights?accountId=${selectedAccount.account_id}&dateFrom=${dateRange.from}&dateTo=${dateRange.to}`).then((r) => r.json()),
        fetch(`/api/alerts?accountId=${selectedAccount.account_id}`).then((r) => r.json()),
      ])
      setCampaigns(campaignsRes.data || [])
      setAllInsights(insightsRes.data || [])
      setAlertRules(alertsRes.data || [])
    } catch {
      setCampaigns([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedAccount.account_id, dateRange.from, dateRange.to])

  useEffect(() => {
    setDateRange(urlRange)
  }, [urlRange.from, urlRange.to])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...campaigns].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    if (typeof aVal === 'string') {
      return sortDir === 'asc' ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string)
    }
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp size={12} className="text-slate-700" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-blue-400" />
      : <ChevronDown size={12} className="text-blue-400" />
  }

  const query = `?dateFrom=${encodeURIComponent(dateRange.from)}&dateTo=${encodeURIComponent(dateRange.to)}`

  const columns: { key: SortKey; label: string }[] = [
    { key: 'campaign_name', label: 'Кампания' },
    { key: 'total_spend', label: 'Расход' },
    { key: 'total_impressions', label: 'Показы' },
    { key: 'total_clicks', label: 'Клики' },
    { key: 'total_results', label: 'Рез-ты' },
    { key: 'avg_ctr', label: 'CTR' },
    { key: 'avg_cpc', label: 'CPC' },
    { key: 'avg_cost_per_result', label: 'Цена/рез' },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Кампании" />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">{selectedAccount.account_name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{campaigns.length} кампаний</p>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRangeAndSyncUrl} />
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="px-4 py-3 text-left cursor-pointer select-none transition-colors"
                      style={{ color: sortKey === col.key ? '#3b82f6' : '#64748b' }}
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        {col.label}
                        <SortIcon k={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 w-10" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3">
                          <div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                        </td>
                      ))}
                      <td className="px-4 py-3" />
                    </tr>
                  ))
                  : sorted.map((campaign, i) => {
                    const isAlerting = isCampaignAlerting(campaign, alertRules)
                    const campaignId = campaign.campaign_id ?? encodeURIComponent(campaign.campaign_name)
                    const href = `/campaigns/${campaignId}${query}`

                    return (
                      <motion.tr
                        key={campaign.campaign_name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(href)}
                        onKeyDown={(e) => e.key === 'Enter' && router.push(href)}
                        className="cursor-pointer transition-colors duration-150 group"
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          background: isAlerting ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isAlerting
                            ? 'rgba(239, 68, 68, 0.08)'
                            : 'rgba(255,255,255,0.03)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isAlerting
                            ? 'rgba(239, 68, 68, 0.04)'
                            : 'transparent'
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isAlerting && (
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#ef4444' }} />
                            )}
                            <span
                              className={cn(
                                'font-medium max-w-[260px] truncate',
                                isAlerting ? 'text-red-300' : 'text-slate-200'
                              )}
                            >
                              {campaign.campaign_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">{formatCurrency(campaign.total_spend)}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{formatNumber(campaign.total_impressions)}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{formatNumber(campaign.total_clicks)}</td>
                        <td className="px-4 py-3 font-mono text-slate-300 font-medium">{formatNumber(campaign.total_results)}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{formatPercent(campaign.avg_ctr)}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{formatCurrency(campaign.avg_cpc)}</td>
                        <td className="px-4 py-3 font-mono">
                          <span
                            className={cn(
                              alertRules.some(
                                (r) =>
                                  r.is_active &&
                                  r.metric === 'cost_per_result' &&
                                  (r.operator === 'above'
                                    ? campaign.avg_cost_per_result > r.threshold
                                    : campaign.avg_cost_per_result < r.threshold)
                              )
                                ? 'text-red-400'
                                : 'text-slate-400'
                            )}
                          >
                            {formatCurrency(campaign.avg_cost_per_result)}
                          </span>
                        </td>
                        <td className="px-4 py-3 w-10">
                          <span className="inline-flex text-slate-500 group-hover:text-white transition-colors">
                            <ChevronRight size={16} />
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })}
              </tbody>
            </table>

            {!isLoading && campaigns.length === 0 && (
              <div className="min-h-[300px] flex flex-col items-center justify-center py-16 text-center text-slate-400">
                <BarChart3 size={40} className="text-slate-700 mb-3" />
                <p>Нет данных за выбранный период</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen">
        <Header title="Кампании" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-slate-500">Загрузка…</div>
        </div>
      </div>
    }>
      <CampaignsPageContent />
    </Suspense>
  )
}
