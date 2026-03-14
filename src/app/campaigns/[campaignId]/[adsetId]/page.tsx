'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { format, subDays } from 'date-fns'
import { parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { X } from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import { Header } from '@/components/layout/header'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { CampaignsBreadcrumbs } from '@/components/campaigns/breadcrumbs'
import { useAccountStore } from '@/hooks/use-account'
import { formatCurrency, formatNumber, formatPercent, cn } from '@/lib/utils'

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

interface AdsetDailyRow {
  date: string
  spend: number
  impressions: number
  reach?: number
  frequency?: number
  clicks: number
  results: number
  ctr: number
  cpc: number
  cost_per_result: number
  video_p25_watched?: number
  video_p50_watched?: number
  video_p75_watched?: number
  video_p100_watched?: number
  video_thruplay?: number
}

interface AdWithMetrics {
  id: string
  name: string
  status: string
  creative?: { id: string; title?: string; body?: string; thumbnail_url?: string; image_url?: string }
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
}

interface AdInsightRow {
  date: string
  spend: number
  impressions: number
  reach: number
  frequency: number
  clicks: number
  results: number
  ctr: number
  cpc: number
  cost_per_result: number
  video_p25_watched: number
  video_p50_watched: number
  video_p75_watched: number
  video_p100_watched: number
  video_thruplay: number
}

const TABS = [
  { id: 'demographics', label: 'Демография' },
  { id: 'placements', label: 'Плейсменты' },
  { id: 'hourly', label: 'По часам' },
] as const

export default function AdsetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const campaignId = String(params.campaignId ?? '')
  const adsetId = String(params.adsetId ?? '')
  const dateFrom = searchParams.get('dateFrom') || format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const dateTo = searchParams.get('dateTo') || format(new Date(), 'yyyy-MM-dd')

  const { selectedAccount } = useAccountStore()
  const [adsetName, setAdsetName] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [dailyRows, setDailyRows] = useState<AdsetDailyRow[]>([])
  const [demographics, setDemographics] = useState<Record<string, unknown>[]>([])
  const [placements, setPlacements] = useState<Record<string, unknown>[]>([])
  const [hourly, setHourly] = useState<Record<string, unknown>[]>([])
  const [ads, setAds] = useState<AdWithMetrics[]>([])
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('demographics')
  const [previewAdId, setPreviewAdId] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [adsLoading, setAdsLoading] = useState(false)
  const [expandedAdId, setExpandedAdId] = useState<string | null>(null)
  const [adInsightsById, setAdInsightsById] = useState<Record<string, AdInsightRow[]>>({})
  const [adInsightsLoadingId, setAdInsightsLoadingId] = useState<string | null>(null)
  const [adInsightsErrorById, setAdInsightsErrorById] = useState<Record<string, string | null>>({})

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
        const adsetsUrl = `/api/meta/adsets?accountId=${selectedAccount.account_id}&campaignId=${encodeURIComponent(campaignId)}&adsetId=${encodeURIComponent(adsetId)}&dateFrom=${dateFrom}&dateTo=${dateTo}`
        const adsetRes = await fetch(adsetsUrl).then((r) => r.json())

        if (cancelled) return

        const rawData: Record<string, unknown>[] = adsetRes.data ?? []
        const raw: AdsetDailyRow[] = rawData.map((r: Record<string, unknown>) => ({
          date: String(r.date),
          spend: Number(r.spend ?? 0),
          impressions: Number(r.impressions ?? 0),
          reach: r.reach != null ? Number(r.reach) : undefined,
          frequency: r.frequency != null ? Number(r.frequency) : undefined,
          clicks: Number(r.clicks ?? 0),
          results: Number(r.results ?? 0),
          ctr: Number(r.ctr ?? 0),
          cpc: Number(r.cpc ?? 0),
          cost_per_result: Number(r.cost_per_result ?? 0),
          video_p25_watched: r.video_p25_watched != null ? Number(r.video_p25_watched) : undefined,
          video_p50_watched: r.video_p50_watched != null ? Number(r.video_p50_watched) : undefined,
          video_p75_watched: r.video_p75_watched != null ? Number(r.video_p75_watched) : undefined,
          video_p100_watched: r.video_p100_watched != null ? Number(r.video_p100_watched) : undefined,
          video_thruplay: r.video_thruplay != null ? Number(r.video_thruplay) : undefined,
        }))

        setDailyRows(raw)
        const first = rawData[0] as Record<string, unknown> | undefined
        if (first) {
          setAdsetName(String(first.adset_name ?? decodeURIComponent(adsetId)))
          setCampaignName(String(first.campaign_name ?? decodeURIComponent(campaignId)))
        } else {
          setAdsetName(decodeURIComponent(adsetId))
          setCampaignName(decodeURIComponent(campaignId))
        }
      } catch {
        setDailyRows([])
        setAdsetName(decodeURIComponent(adsetId))
        setCampaignName(decodeURIComponent(campaignId))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [selectedAccount.account_id, campaignId, adsetId, dateFrom, dateTo])

  useEffect(() => {
    if (!campaignName) return
    let cancelled = false

    async function loadBreakdowns() {
      try {
        const [demoRes, placeRes, hourRes] = await Promise.all([
          fetch(
            `/api/meta/demographics?accountId=${selectedAccount.account_id}&dateFrom=${dateFrom}&dateTo=${dateTo}&campaignName=${encodeURIComponent(campaignName)}`
          ).then((r) => r.json()),
          fetch(
            `/api/meta/placements?accountId=${selectedAccount.account_id}&dateFrom=${dateFrom}&dateTo=${dateTo}&campaignName=${encodeURIComponent(campaignName)}`
          ).then((r) => r.json()),
          fetch(
            `/api/meta/hourly?accountId=${selectedAccount.account_id}&dateFrom=${dateFrom}&dateTo=${dateTo}&campaignName=${encodeURIComponent(campaignName)}`
          ).then((r) => r.json()),
        ])
        if (cancelled) return
        setDemographics(demoRes.data ?? [])
        setPlacements(placeRes.data ?? [])
        setHourly(hourRes.data ?? [])
      } catch {
        // keep previous
      }
    }

    loadBreakdowns()
    return () => {
      cancelled = true
    }
  }, [selectedAccount.account_id, campaignName, dateFrom, dateTo])

  useEffect(() => {
    if (!adsetId || /^\d+$/.test(adsetId) === false) return
    let cancelled = false
    setAdsLoading(true)
    fetch(
      `/api/meta/ads?adsetId=${adsetId}&accountId=${selectedAccount.account_id}&dateFrom=${dateFrom}&dateTo=${dateTo}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAds(data.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setAds([])
      })
      .finally(() => {
        if (!cancelled) setAdsLoading(false)
      })
  }, [adsetId, selectedAccount.account_id, dateFrom, dateTo])

  const totals = {
    spend: dailyRows.reduce((s, r) => s + r.spend, 0),
    reach: dailyRows.reduce((s, r) => s + (r.reach ?? 0), 0),
    impressions: dailyRows.reduce((s, r) => s + r.impressions, 0),
    frequency: dailyRows.length ? dailyRows.reduce((s, r) => s + (r.frequency ?? 0), 0) / dailyRows.length : 0,
    clicks: dailyRows.reduce((s, r) => s + r.clicks, 0),
    results: dailyRows.reduce((s, r) => s + r.results, 0),
    ctr: dailyRows.length ? dailyRows.reduce((s, r) => s + r.ctr, 0) / dailyRows.length : 0,
    cpc: dailyRows.length ? dailyRows.reduce((s, r) => s + r.cpc, 0) / dailyRows.length : 0,
    costPerResult: 0 as number,
  }
  totals.costPerResult = totals.results > 0 ? totals.spend / totals.results : 0

  const spendByDay = [...dailyRows].sort((a, b) => a.date.localeCompare(b.date)).map((r) => ({ date: r.date, spend: Math.round(r.spend * 100) / 100 }))
  const frequencyByDay = [...dailyRows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: r.date, frequency: Math.round((r.frequency ?? 0) * 100) / 100 }))

  const hasVideo = dailyRows.some((r) => (r.video_p25_watched ?? 0) > 0)
  const videoFunnel = hasVideo
    ? [
        { name: '25%', value: dailyRows.reduce((s, r) => s + (r.video_p25_watched ?? 0), 0) },
        { name: '50%', value: dailyRows.reduce((s, r) => s + (r.video_p50_watched ?? 0), 0) },
        { name: '75%', value: dailyRows.reduce((s, r) => s + (r.video_p75_watched ?? 0), 0) },
        { name: '100%', value: dailyRows.reduce((s, r) => s + (r.video_p100_watched ?? 0), 0) },
        { name: 'ThruPlay', value: dailyRows.reduce((s, r) => s + (r.video_thruplay ?? 0), 0) },
      ].filter((d) => d.value > 0)
    : []

  const breadcrumbItems = [
    { label: 'Кампании', href: '/campaigns' },
    { label: campaignName || '…', href: `/campaigns/${campaignId}` },
    { label: adsetName || '…', href: undefined },
  ]
  const queryParams = { dateFrom, dateTo }

  const openPreview = useCallback((adId: string) => {
    setPreviewAdId(adId)
    setPreviewHtml('')
    fetch(`/api/meta/preview?adId=${encodeURIComponent(adId)}`)
      .then((r) => r.text())
      .then((html) => setPreviewHtml(html))
      .catch(() => setPreviewHtml('<p class="p-4 text-red-400">Не удалось загрузить превью</p>'))
  }, [])

  const toggleAdExpanded = useCallback(
    async (adId: string) => {
      setAdInsightsErrorById((prev) => ({ ...prev, [adId]: null }))

      // collapse
      if (expandedAdId === adId) {
        setExpandedAdId(null)
        return
      }

      setExpandedAdId(adId)

      // lazy-load (cache)
      if (adInsightsById[adId]) return

      setAdInsightsLoadingId(adId)
      try {
        const url = `/api/meta/ad-insights?accountId=${encodeURIComponent(selectedAccount.account_id)}&adId=${encodeURIComponent(adId)}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`
        const res = await fetch(url).then((r) => r.json())
        const raw: Record<string, unknown>[] = res.data ?? []

        const rows: AdInsightRow[] = raw.map((r) => ({
          date: String(r.date),
          spend: Number(r.spend ?? 0),
          impressions: Number(r.impressions ?? 0),
          reach: Number(r.reach ?? 0),
          frequency: Number(r.frequency ?? 0),
          clicks: Number(r.clicks ?? 0),
          results: Number(r.results ?? 0),
          ctr: Number(r.ctr ?? 0),
          cpc: Number(r.cpc ?? 0),
          cost_per_result: Number(r.cost_per_result ?? 0),
          video_p25_watched: Number(r.video_p25_watched ?? 0),
          video_p50_watched: Number(r.video_p50_watched ?? 0),
          video_p75_watched: Number(r.video_p75_watched ?? 0),
          video_p100_watched: Number(r.video_p100_watched ?? 0),
          video_thruplay: Number(r.video_thruplay ?? 0),
        }))

        setAdInsightsById((prev) => ({ ...prev, [adId]: rows }))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Не удалось загрузить данные'
        setAdInsightsErrorById((prev) => ({ ...prev, [adId]: msg }))
      } finally {
        setAdInsightsLoadingId((prev) => (prev === adId ? null : prev))
      }
    },
    [adInsightsById, dateFrom, dateTo, expandedAdId, selectedAccount.account_id]
  )

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Кампании" />

      <div className="flex-1 p-6 space-y-6">
        <CampaignsBreadcrumbs items={breadcrumbItems} searchParams={queryParams} />

        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-white truncate max-w-full">{isLoading ? '…' : adsetName || 'Адсет'}</h1>
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
              <div className="flex border-b border-white/5">
                {TABS.map((tab) => (
                  <div key={tab.id} className="px-4 py-3 w-24 h-10 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                ))}
              </div>
              <div className="min-h-[300px] flex items-center justify-center p-4">
                <div className="h-[220px] w-full max-w-md rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
              </div>
            </div>
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="h-12 border-b border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }} />
              <div className="divide-y divide-white/5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-[60px] h-[60px] rounded-lg animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="h-4 w-32 rounded animate-pulse flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="h-4 w-24 rounded animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Расход по дням</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={spendByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="adsetSpendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Расход']} labelFormatter={formatChartDate} />
                    <Area type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} fill="url(#adsetSpendGrad)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Частота по дням</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={frequencyByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), 'Частота']} labelFormatter={formatChartDate} />
                    <ReferenceLine y={3} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Выгорание', position: 'right', fill: '#ef4444', fontSize: 10 }} />
                    <Line type="monotone" dataKey="frequency" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {hasVideo && videoFunnel.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Воронка просмотров (25% / 50% / 75% / 100% / ThruPlay)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={videoFunnel} layout="vertical" margin={{ left: 50, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatNumber(Number(v)), 'Просмотры']} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="glass-card rounded-xl overflow-hidden">
              <div className="flex border-b border-white/5">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'px-4 py-3 text-sm font-medium transition-colors',
                      activeTab === tab.id ? 'text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-4 min-h-[300px]">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === 'demographics' && <BreakdownCharts data={demographics} type="demographics" />}
                  {activeTab === 'placements' && <BreakdownCharts data={placements} type="placements" />}
                  {activeTab === 'hourly' && <BreakdownCharts data={hourly} type="hourly" />}
                </motion.div>
              </div>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <h2 className="text-lg font-semibold text-white px-4 py-3 border-b border-white/5">Объявления</h2>
              {adsLoading ? (
                <div className="divide-y divide-white/5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                      <div className="w-[60px] h-[60px] rounded-lg animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="h-4 w-32 rounded animate-pulse mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <div className="h-3 w-16 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                      </div>
                      <div className="h-4 w-24 rounded animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    </div>
                  ))}
                </div>
              ) : ads.length === 0 ? (
                <div className="min-h-[300px] flex items-center justify-center text-slate-500 text-sm px-4">Нет объявлений в этом адсете</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {ads.map((ad) => {
                    const isExpanded = expandedAdId === ad.id
                    const isInsightsLoading = adInsightsLoadingId === ad.id
                    const insights = adInsightsById[ad.id]
                    const insightsError = adInsightsErrorById[ad.id]

                    return (
                      <div key={ad.id}>
                        <AdRow
                          ad={ad}
                          isExpanded={isExpanded}
                          onToggleExpanded={() => toggleAdExpanded(ad.id)}
                          onPreview={() => openPreview(ad.id)}
                        />
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="px-4 pb-4"
                            >
                              <div
                                className="rounded-xl p-4 mt-2"
                                style={{
                                  background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                }}
                              >
                                {isInsightsLoading && <AdInsightsSkeleton />}
                                {!isInsightsLoading && insightsError && (
                                  <div className="text-sm text-red-400">{insightsError}</div>
                                )}
                                {!isInsightsLoading && !insightsError && (
                                  <AdInsightsPanel
                                    rows={insights ?? []}
                                  />
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {previewAdId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setPreviewAdId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#1a1a26] rounded-xl border border-white/10 shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="text-white font-medium">Превью</span>
                <button
                  onClick={() => setPreviewAdId(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 min-h-[300px]">
                {previewHtml ? (
                  <iframe
                    title="Ad preview"
                    srcDoc={previewHtml}
                    className="w-full min-h-[400px] border-0 rounded-lg"
                    sandbox="allow-scripts"
                  />
                ) : (
                  <div className="flex items-center justify-center min-h-[300px] text-slate-500">Загрузка…</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-0.5"
      style={{
        background: highlight ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
        border: highlight ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span className={cn('text-[10px] font-medium uppercase tracking-wide', highlight ? 'text-red-400' : 'text-slate-500')}>{label}</span>
      <span className={cn('text-sm font-semibold font-mono leading-tight', highlight ? 'text-red-300' : 'text-white')}>{value}</span>
    </div>
  )
}

function BreakdownCharts({ data, type }: { data: Record<string, unknown>[]; type: 'demographics' | 'placements' | 'hourly' }) {
  if (data.length === 0) {
    return (
      <div className="min-h-[300px] flex items-center justify-center text-slate-500">
        Нет данных
      </div>
    )
  }

  if (type === 'demographics') {
    const byAge = data.reduce<Record<string, number>>((acc, r) => {
      const age = String(r.age ?? 'unknown')
      acc[age] = (acc[age] || 0) + Number(r.spend ?? 0)
      return acc
    }, {})
    const chartData = Object.entries(byAge).map(([age, spend]) => ({ age, spend: Math.round(spend * 100) / 100 })).sort((a, b) => b.spend - a.spend)
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis dataKey="age" type="category" width={50} tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Расход']} />
          <Bar dataKey="spend" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'placements') {
    const byPlace = data.reduce<Record<string, number>>((acc, r) => {
      const key = [r.publisher_platform, r.platform_position].filter(Boolean).join(' / ') || 'unknown'
      acc[key] = (acc[key] || 0) + Number(r.spend ?? 0)
      return acc
    }, {})
    const chartData = Object.entries(byPlace).map(([name, spend]) => ({ name: name.length > 25 ? name.slice(0, 25) + '…' : name, spend: Math.round(spend * 100) / 100 })).sort((a, b) => b.spend - a.spend).slice(0, 10)
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Расход']} />
          <Bar dataKey="spend" fill="#10b981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  const byHour = data.reduce<Record<number, number>>((acc, r) => {
    const h = Number(r.hour ?? 0)
    acc[h] = (acc[h] || 0) + Number(r.spend ?? 0)
    return acc
  }, {})
  const hourData = Array.from({ length: 24 }, (_, i) => ({ hour: i, spend: Math.round((byHour[i] ?? 0) * 100) / 100 }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={hourData} margin={{ left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Расход']} labelFormatter={(h) => `Час ${h}`} />
        <Bar dataKey="spend" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function AdRow({
  ad,
  onPreview,
  onToggleExpanded,
  isExpanded,
}: {
  ad: AdWithMetrics
  onPreview: () => void
  onToggleExpanded: () => void
  isExpanded: boolean
}) {
  const statusColor = ad.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-500'
  const thumb = ad.creative?.thumbnail_url || ad.creative?.image_url

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3 min-h-[72px] transition-colors duration-150 hover:bg-white/[0.03] cursor-pointer',
        isExpanded && 'bg-white/[0.02]'
      )}
      role="button"
      tabIndex={0}
      onClick={onToggleExpanded}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggleExpanded()
        }
      }}
    >
      <div className="w-[60px] h-[60px] rounded-lg flex-shrink-0 overflow-hidden bg-slate-800/80">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">—</div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <p className="text-sm font-medium text-white truncate" title={ad.name}>
          {ad.name}
        </p>
        <span className={cn('text-xs font-medium', statusColor)}>{ad.status}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-400 font-mono flex-shrink-0">
        <span className="whitespace-nowrap">Расход {formatCurrency(ad.spend)}</span>
        <span className="whitespace-nowrap">Показы {formatNumber(ad.impressions)}</span>
        <span className="whitespace-nowrap">CTR {formatPercent(ad.ctr)}</span>
        <span className="whitespace-nowrap">CPC {formatCurrency(ad.cpc)}</span>
      </div>
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onPreview()
        }}
        className="py-2 px-3 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
        style={{
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: '#3b82f6',
        }}
      >
        Превью
      </button>
    </div>
  )
}

function AdInsightsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[180px] rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-[180px] rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
      <div className="h-[180px] rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

function AdInsightsPanel({ rows }: { rows: AdInsightRow[] }) {
  if (!rows || rows.length === 0) {
    return <div className="text-sm text-slate-500">Нет данных по этому объявлению за выбранный период.</div>
  }

  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))

  const totals = {
    spend: sorted.reduce((s, r) => s + r.spend, 0),
    impressions: sorted.reduce((s, r) => s + r.impressions, 0),
    reach: sorted.reduce((s, r) => s + r.reach, 0),
    frequency: sorted.length ? sorted.reduce((s, r) => s + r.frequency, 0) / sorted.length : 0,
    clicks: sorted.reduce((s, r) => s + r.clicks, 0),
    results: sorted.reduce((s, r) => s + r.results, 0),
    ctr: sorted.length ? sorted.reduce((s, r) => s + r.ctr, 0) / sorted.length : 0,
    cpc: sorted.length ? sorted.reduce((s, r) => s + r.cpc, 0) / sorted.length : 0,
    costPerResult: 0 as number,
  }
  totals.costPerResult = totals.results > 0 ? totals.spend / totals.results : 0

  const spendByDay = sorted.map((r) => ({ date: r.date, spend: Math.round(r.spend * 100) / 100 }))
  const ctrCpcByDay = sorted.map((r) => ({
    date: r.date,
    ctr: Math.round(r.ctr * 1000) / 1000,
    cpc: Math.round(r.cpc * 100) / 100,
  }))
  const frequencyByDay = sorted.map((r) => ({
    date: r.date,
    frequency: Math.round(r.frequency * 100) / 100,
  }))

  const hasVideo = sorted.some((r) => r.video_p25_watched > 0)
  const videoFunnel = hasVideo
    ? [
        { name: '25%', value: sorted.reduce((s, r) => s + r.video_p25_watched, 0) },
        { name: '50%', value: sorted.reduce((s, r) => s + r.video_p50_watched, 0) },
        { name: '75%', value: sorted.reduce((s, r) => s + r.video_p75_watched, 0) },
        { name: '100%', value: sorted.reduce((s, r) => s + r.video_p100_watched, 0) },
        { name: 'ThruPlay', value: sorted.reduce((s, r) => s + r.video_thruplay, 0) },
      ].filter((d) => d.value > 0)
    : []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
        <MetricCard label="Расход" value={formatCurrency(totals.spend)} />
        <MetricCard label="Показы" value={formatNumber(totals.impressions)} />
        <MetricCard label="Охват" value={formatNumber(totals.reach)} />
        <MetricCard label="Частота" value={totals.frequency.toFixed(2)} highlight={totals.frequency > 3} />
        <MetricCard label="Клики" value={formatNumber(totals.clicks)} />
        <MetricCard label="Результаты" value={formatNumber(totals.results)} />
        <MetricCard label="CTR" value={formatPercent(totals.ctr)} />
        <MetricCard label="CPC" value={formatCurrency(totals.cpc)} />
        <MetricCard label="Цена/рез." value={formatCurrency(totals.costPerResult)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Расход по дням</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={spendByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Расход']} labelFormatter={formatChartDate} />
              <Line type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">CTR и CPC по дням</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={ctrCpcByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={formatChartDate}
                formatter={(v, name) => {
                  if (name === 'ctr') return [formatPercent(Number(v)), 'CTR']
                  return [formatCurrency(Number(v)), 'CPC']
                }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
              <Line yAxisId="left" type="monotone" dataKey="ctr" stroke="#10b981" strokeWidth={2} dot={false} name="CTR" />
              <Line yAxisId="right" type="monotone" dataKey="cpc" stroke="#f59e0b" strokeWidth={2} dot={false} name="CPC" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {hasVideo && videoFunnel.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Воронка просмотров (P25 / P50 / P75 / P100 / ThruPlay)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={videoFunnel} layout="vertical" margin={{ left: 50, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatNumber(Number(v)), 'Просмотры']} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="glass-card rounded-xl p-4">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Частота по дням</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={frequencyByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), 'Частота']} labelFormatter={formatChartDate} />
            <ReferenceLine y={3} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Выгорание', position: 'right', fill: '#ef4444', fontSize: 10 }} />
            <Line type="monotone" dataKey="frequency" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
