'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { format, subDays } from 'date-fns'
import {
  DollarSign,
  Eye,
  MousePointer2,
  Target,
  TrendingDown,
  BarChart2,
  Star,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { MetricCard } from '@/components/dashboard/metric-card'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { AiInsightsBlock } from '@/components/dashboard/ai-insights-block'
import {
  SpendChart,
  CpcCprChart,
  ResultsByCampaignChart,
  ImpressionsClicksChart,
} from '@/components/dashboard/charts'
import { useAccountStore } from '@/hooks/use-account'
import { CampaignInsight } from '@/types'
import { formatCurrency, formatNumber, formatPercent, calcPercentChange } from '@/lib/utils'

const CHART_TITLES = [
  { key: 'spend', title: 'Расход по дням' },
  { key: 'cpc_cpr', title: 'CPC и Цена/результат' },
  { key: 'results', title: 'Результаты по кампаниям' },
  { key: 'impressions', title: 'Показы и клики' },
]

function sumMetric(data: CampaignInsight[], key: keyof CampaignInsight): number {
  return data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0)
}

function avgMetric(data: CampaignInsight[], key: keyof CampaignInsight): number {
  if (!data.length) return 0
  return sumMetric(data, key) / data.length
}

export default function DashboardPage() {
  const { selectedAccount } = useAccountStore()
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  })
  const [prevDateRange] = useState({
    from: format(subDays(new Date(), 60), 'yyyy-MM-dd'),
    to: format(subDays(new Date(), 31), 'yyyy-MM-dd'),
  })

  const [insights, setInsights] = useState<CampaignInsight[]>([])
  const [prevInsights, setPrevInsights] = useState<CampaignInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchInsights = useCallback(async () => {
    setIsLoading(true)
    try {
      const [curr, prev] = await Promise.all([
        fetch(`/api/meta/insights?accountId=${selectedAccount.account_id}&dateFrom=${dateRange.from}&dateTo=${dateRange.to}`).then((r) => r.json()),
        fetch(`/api/meta/insights?accountId=${selectedAccount.account_id}&dateFrom=${prevDateRange.from}&dateTo=${prevDateRange.to}`).then((r) => r.json()),
      ])
      setInsights(curr.data || [])
      setPrevInsights(prev.data || [])
    } catch {
      setInsights([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedAccount.account_id, dateRange.from, dateRange.to, prevDateRange.from, prevDateRange.to])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const totalSpend = sumMetric(insights, 'spend')
  const totalImpressions = sumMetric(insights, 'impressions')
  const totalClicks = sumMetric(insights, 'clicks')
  const totalResults = sumMetric(insights, 'results')
  const avgCtr = avgMetric(insights, 'ctr')
  const avgCpc = avgMetric(insights, 'cpc')
  const avgCpr = totalResults > 0 ? totalSpend / totalResults : 0

  const prevSpend = sumMetric(prevInsights, 'spend')
  const prevImpressions = sumMetric(prevInsights, 'impressions')
  const prevClicks = sumMetric(prevInsights, 'clicks')
  const prevResults = sumMetric(prevInsights, 'results')
  const prevCtr = avgMetric(prevInsights, 'ctr')
  const prevCpc = avgMetric(prevInsights, 'cpc')
  const prevCpr = prevResults > 0 ? prevSpend / prevResults : 0

  const metrics = [
    {
      title: 'Расход',
      value: formatCurrency(totalSpend),
      change: calcPercentChange(totalSpend, prevSpend),
      icon: <DollarSign size={16} className="text-blue-400" />,
      isPositiveWhenUp: false,
    },
    {
      title: 'Показы',
      value: formatNumber(totalImpressions),
      change: calcPercentChange(totalImpressions, prevImpressions),
      icon: <Eye size={16} className="text-purple-400" />,
      isPositiveWhenUp: true,
    },
    {
      title: 'Клики',
      value: formatNumber(totalClicks),
      change: calcPercentChange(totalClicks, prevClicks),
      icon: <MousePointer2 size={16} className="text-cyan-400" />,
      isPositiveWhenUp: true,
    },
    {
      title: 'Результаты',
      value: formatNumber(totalResults),
      change: calcPercentChange(totalResults, prevResults),
      icon: <Star size={16} className="text-yellow-400" />,
      isPositiveWhenUp: true,
    },
    {
      title: 'Avg CTR',
      value: formatPercent(avgCtr),
      change: calcPercentChange(avgCtr, prevCtr),
      icon: <BarChart2 size={16} className="text-emerald-400" />,
      isPositiveWhenUp: true,
    },
    {
      title: 'Avg CPC',
      value: formatCurrency(avgCpc),
      change: calcPercentChange(avgCpc, prevCpc),
      icon: <TrendingDown size={16} className="text-orange-400" />,
      isPositiveWhenUp: false,
    },
    {
      title: 'Цена за результат',
      value: formatCurrency(avgCpr),
      change: calcPercentChange(avgCpr, prevCpr),
      icon: <Target size={16} className="text-red-400" />,
      isPositiveWhenUp: false,
    },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Dashboard" />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{selectedAccount.account_name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">Обзор рекламных кампаний</p>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-5 h-28 animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {metrics.map((m, i) => (
              <MetricCard key={m.title} {...m} index={i} />
            ))}
          </div>
        )}

        {insights.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-xl p-8 text-center">
            <BarChart2 size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Нет данных за выбранный период</p>
            <p className="text-slate-600 text-sm mt-1">
              Нажмите "Обновить" для синхронизации данных из Meta API
            </p>
          </motion.div>
        )}

        {insights.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[
              { title: 'Расход по дням', chart: <SpendChart data={insights} /> },
              { title: 'CPC и Цена/результат', chart: <CpcCprChart data={insights} /> },
              { title: 'Результаты по кампаниям', chart: <ResultsByCampaignChart data={insights} /> },
              { title: 'Показы и клики', chart: <ImpressionsClicksChart data={insights} /> },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="glass-card rounded-xl p-5">
                <h3 className="text-sm font-medium text-slate-300 mb-4">{item.title}</h3>
                {item.chart}
              </motion.div>
            ))}
          </div>
        )}

        <AiInsightsBlock dateFrom={dateRange.from} dateTo={dateRange.to} />
      </div>
    </div>
  )
}
