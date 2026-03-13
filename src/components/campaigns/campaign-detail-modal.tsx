'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { CampaignInsight } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface AdsetInsightRow {
  adset_name: string
  adset_id: string | null
  date: string
  spend: number
  impressions: number
  clicks: number
  results: number
  ctr: number
  cpc: number
  cost_per_result: number
}

interface DemographicRow {
  age: string | null
  gender: string | null
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  results: number
}

interface PlacementRow {
  publisher_platform: string | null
  platform_position: string | null
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
}

interface GeoRow {
  country: string | null
  region: string | null
  spend: number
  impressions: number
  clicks: number
  ctr: number
  results: number
}

interface HourlyRow {
  hour: number
  spend: number
  impressions: number
  clicks: number
  ctr: number
}

interface Props {
  campaign: CampaignRow
  accountId: string
  accountName: string
  dateFrom: string
  dateTo: string
  dailyInsights: CampaignInsight[]
  onClose: () => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

const tooltipStyle = {
  backgroundColor: '#1a1a26',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#f1f5f9',
  fontSize: '12px',
}

const TABS = [
  { id: 'overview', label: 'Обзор' },
  { id: 'reach', label: 'Охват' },
  { id: 'video', label: 'Видео' },
  { id: 'adsets', label: 'Адсеты' },
  { id: 'demographics', label: 'Демография' },
  { id: 'placements', label: 'Плейсменты' },
  { id: 'geo', label: 'География' },
  { id: 'hourly', label: 'По часам' },
] as const

type TabId = (typeof TABS)[number]['id']

interface TabDataState {
  overview: null
  reach: null
  video: null
  adsets: AdsetInsightRow[] | null
  demographics: DemographicRow[] | null
  placements: PlacementRow[] | null
  geo: GeoRow[] | null
  hourly: HourlyRow[] | null
}

const initialTabData: TabDataState = {
  overview: null,
  reach: null,
  video: null,
  adsets: null,
  demographics: null,
  placements: null,
  geo: null,
  hourly: null,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (date: unknown) => {
  try {
    return format(parseISO(String(date)), 'd MMM', { locale: ru })
  } catch {
    return String(date)
  }
}

function cleanPositionName(raw: string | null): string {
  if (!raw) return '—'
  return raw
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  )
}

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="w-full rounded-xl animate-pulse"
      style={{ height, background: 'rgba(255,255,255,0.04)' }}
    />
  )
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-0.5"
      style={{
        background: highlight ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
        border: highlight ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span className={`text-[10px] font-medium uppercase tracking-wide ${highlight ? 'text-red-400' : 'text-slate-500'}`}>{label}</span>
      <span className={`text-sm font-semibold font-mono leading-tight ${highlight ? 'text-red-300' : 'text-white'}`}>{value}</span>
    </div>
  )
}

// ─── Tab: Overview ───────────────────────────────────────────────────────────

function OverviewTab({ campaign, dailyInsights }: { campaign: CampaignRow; dailyInsights: CampaignInsight[] }) {
  const spendByDay = dailyInsights
    .filter((r) => r.campaign_name === campaign.campaign_name)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.date] = (acc[r.date] || 0) + r.spend
      return acc
    }, {})
  const spendChartData = Object.entries(spendByDay)
    .map(([date, spend]) => ({ date, spend: Math.round(spend * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const cpcCprByDay = dailyInsights
    .filter((r) => r.campaign_name === campaign.campaign_name)
    .reduce<Record<string, { cpc: number[]; cpr: number[] }>>((acc, r) => {
      if (!acc[r.date]) acc[r.date] = { cpc: [], cpr: [] }
      acc[r.date].cpc.push(r.cpc)
      acc[r.date].cpr.push(r.cost_per_result)
      return acc
    }, {})
  const cpcCprData = Object.entries(cpcCprByDay)
    .map(([date, v]) => ({
      date,
      cpc: v.cpc.length ? Math.round((v.cpc.reduce((a, b) => a + b) / v.cpc.length) * 100) / 100 : 0,
      cpr: v.cpr.length ? Math.round((v.cpr.reduce((a, b) => a + b) / v.cpr.length) * 100) / 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const resultsByDay = dailyInsights
    .filter((r) => r.campaign_name === campaign.campaign_name)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.date] = (acc[r.date] || 0) + r.results
      return acc
    }, {})
  const resultsData = Object.entries(resultsByDay)
    .map(([date, results]) => ({ date, results }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-2">
        <MetricCard label="Расход" value={formatCurrency(campaign.total_spend)} />
        <MetricCard label="Показы" value={formatNumber(campaign.total_impressions)} />
        <MetricCard label="Клики" value={formatNumber(campaign.total_clicks)} />
        <MetricCard label="Результаты" value={formatNumber(campaign.total_results)} />
        <MetricCard label="CTR" value={formatPercent(campaign.avg_ctr)} />
        <MetricCard label="CPC" value={formatCurrency(campaign.avg_cpc)} />
        <MetricCard label="Цена/рез." value={formatCurrency(campaign.avg_cost_per_result)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Расход по дням</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={spendChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="modalSpendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Расход']} labelFormatter={formatDate} />
              <Area type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} fill="url(#modalSpendGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">CPC и Цена/результат по дням</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cpcCprData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [formatCurrency(Number(v)), name === 'cpc' ? 'CPC' : 'Цена/рез.']} labelFormatter={formatDate} />
              <Legend formatter={(v) => (v === 'cpc' ? 'CPC' : 'Цена/рез.')} wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="cpc" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cpr" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Результаты по дням</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={resultsData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), 'Результаты']} labelFormatter={formatDate} />
            <Bar dataKey="results" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Tab: Reach (Охват) ───────────────────────────────────────────────────────

function ReachTab({ campaign, dailyInsights }: { campaign: CampaignRow; dailyInsights: CampaignInsight[] }) {
  const campaignInsights = dailyInsights.filter((r) => r.campaign_name === campaign.campaign_name)
  const totalReach = campaignInsights.reduce((s, r) => s + (r.reach ?? 0), 0)
  const avgFrequency =
    campaignInsights.length > 0
      ? campaignInsights.reduce((s, r) => s + (r.frequency ?? 0), 0) / campaignInsights.length
      : 0
  const reachByDay = campaignInsights
    .map((r) => ({ date: r.date, reach: r.reach ?? 0 }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const frequencyByDay = campaignInsights
    .map((r) => ({ date: r.date, frequency: Math.round((r.frequency ?? 0) * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 max-w-xs">
        <MetricCard label="Total Reach" value={formatNumber(totalReach)} />
        <MetricCard label="Avg Frequency" value={avgFrequency.toFixed(2)} highlight={avgFrequency > 3.0} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Охват по дням</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={reachByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatNumber(Number(v)), 'Охват']} labelFormatter={formatDate} />
              <Line type="monotone" dataKey="reach" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Частота по дням</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={frequencyByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), 'Частота']} labelFormatter={formatDate} />
              <ReferenceLine y={3} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Выгорание', position: 'right', fill: '#ef4444', fontSize: 10 }} />
              <Line type="monotone" dataKey="frequency" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Video (Видео) ──────────────────────────────────────────────────────

function VideoTab({ campaign, dailyInsights }: { campaign: CampaignRow; dailyInsights: CampaignInsight[] }) {
  const campaignInsights = dailyInsights.filter((r) => r.campaign_name === campaign.campaign_name)
  const p25 = campaignInsights.reduce((s, r) => s + (r.video_p25_watched ?? 0), 0)
  const p50 = campaignInsights.reduce((s, r) => s + (r.video_p50_watched ?? 0), 0)
  const p75 = campaignInsights.reduce((s, r) => s + (r.video_p75_watched ?? 0), 0)
  const p100 = campaignInsights.reduce((s, r) => s + (r.video_p100_watched ?? 0), 0)
  const thruplay = campaignInsights.reduce((s, r) => s + (r.video_thruplay ?? 0), 0)
  const funnelData = [
    { name: '25%', value: p25 },
    { name: '50%', value: p50 },
    { name: '75%', value: p75 },
    { name: '100%', value: p100 },
    { name: 'ThruPlay', value: thruplay },
  ].filter((d) => d.value > 0)

  const totalImpressions = campaignInsights.reduce((s, r) => s + r.impressions, 0)
  const completionRateByDay = campaignInsights
    .map((r) => ({
      date: r.date,
      rate: r.impressions > 0 ? Math.round((r.video_thruplay ?? 0) / r.impressions * 10000) / 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const avgCompletionRate = totalImpressions > 0 ? (thruplay / totalImpressions) * 100 : 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 max-w-xs">
        <MetricCard label="Avg completion rate" value={formatPercent(avgCompletionRate)} />
        <MetricCard label="Total ThruPlays" value={formatNumber(thruplay)} />
      </div>
      {funnelData.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Воронка просмотров</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 50, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={50} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatNumber(Number(v)), 'Просмотры']} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Completion rate по дням (ThruPlay / Impressions %)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={completionRateByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatPercent(Number(v)), 'Rate']} labelFormatter={formatDate} />
            <Line type="monotone" dataKey="rate" stroke="#06b6d4" strokeWidth={2} dot={false} name="Completion %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Tab: Ad Sets ────────────────────────────────────────────────────────────

interface AdsetAgg {
  adset_name: string
  total_spend: number
  total_results: number
  avg_cpc: number
  dates: Record<string, { cpc: number; n: number }>
}

function AdsetsTab({ data, isLoading }: { data: AdsetInsightRow[] | null; isLoading: boolean }) {
  const rows = data ?? []
  const adsets: AdsetAgg[] = Object.values(
    rows.reduce<Record<string, AdsetAgg>>((acc, r) => {
      if (!acc[r.adset_name]) {
        acc[r.adset_name] = { adset_name: r.adset_name, total_spend: 0, total_results: 0, avg_cpc: 0, dates: {} }
      }
      acc[r.adset_name].total_spend += r.spend
      acc[r.adset_name].total_results += r.results
      if (!acc[r.adset_name].dates[r.date]) acc[r.adset_name].dates[r.date] = { cpc: 0, n: 0 }
      acc[r.adset_name].dates[r.date].cpc += r.cpc
      acc[r.adset_name].dates[r.date].n += 1
      return acc
    }, {})
  ).map((a) => ({
    ...a,
    avg_cpc: rows.filter((r) => r.adset_name === a.adset_name).reduce((s, r) => s + r.cpc, 0) /
      Math.max(rows.filter((r) => r.adset_name === a.adset_name).length, 1),
  })).sort((a, b) => b.total_spend - a.total_spend)

  const spendBarData = adsets.slice(0, 10).map((a) => ({
    name: a.adset_name.length > 22 ? a.adset_name.slice(0, 22) + '…' : a.adset_name,
    spend: Math.round(a.total_spend * 100) / 100,
  }))

  const resultsBarData = adsets.slice(0, 10).map((a) => ({
    name: a.adset_name.length > 22 ? a.adset_name.slice(0, 22) + '…' : a.adset_name,
    results: a.total_results,
  }))

  // Multi-line CPC over time
  const allDates = [...new Set(rows.map((r) => r.date))].sort()
  const top5Adsets = adsets.slice(0, 5).map((a) => a.adset_name)
  const cpcTimeData = allDates.map((date) => {
    const point: Record<string, string | number> = { date }
    top5Adsets.forEach((name) => {
      const dayRows = rows.filter((r) => r.adset_name === name && r.date === date)
      point[name.slice(0, 18)] = dayRows.length
        ? Math.round((dayRows.reduce((s, r) => s + r.cpc, 0) / dayRows.length) * 100) / 100
        : 0
    })
    return point
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    )
  }

  if (adsets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
        Нет данных по адсетам. Запустите синхронизацию.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Расход по адсету</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={spendBarData} layout="vertical" margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Расход']} />
              <Bar dataKey="spend" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Результаты по адсету</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={resultsBarData} layout="vertical" margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), 'Результаты']} />
              <Bar dataKey="results" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {cpcTimeData.length > 1 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">CPC по адсетам по времени (топ 5)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cpcTimeData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'CPC']} labelFormatter={formatDate} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {top5Adsets.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name.slice(0, 18)} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Demographics ───────────────────────────────────────────────────────

function DemographicsTab({ data, isLoading }: { data: DemographicRow[] | null; isLoading: boolean }) {
  const rows = data ?? []
  const byAge = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.age ?? 'unknown'
    acc[key] = (acc[key] || 0) + r.spend
    return acc
  }, {})
  const spendByAgeData = Object.entries(byAge)
    .map(([age, spend]) => ({ age, spend: Math.round(spend * 100) / 100 }))
    .sort((a, b) => b.spend - a.spend)

  const byAgeGender = rows.reduce<Record<string, { male: number; female: number }>>((acc, r) => {
    const age = r.age ?? 'unknown'
    if (!acc[age]) acc[age] = { male: 0, female: 0 }
    if (r.gender === 'male') acc[age].male += r.impressions
    else if (r.gender === 'female') acc[age].female += r.impressions
    return acc
  }, {})
  const genderData = Object.entries(byAgeGender).map(([age, v]) => ({ age, male: v.male, female: v.female }))

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
        Нет демографических данных.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Расход по возрасту</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={spendByAgeData} layout="vertical" margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="age" type="category" width={50} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Расход']} />
            <Bar dataKey="spend" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Показы: мужчины / женщины</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={genderData} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="male" name="М" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            <Bar dataKey="female" name="Ж" fill="#ec4899" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Tab: Placements ─────────────────────────────────────────────────────────

function PlacementsTab({ data, isLoading }: { data: PlacementRow[] | null; isLoading: boolean }) {
  const rows = data ?? []
  const byPlatform = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.publisher_platform ?? 'unknown'
    acc[key] = (acc[key] || 0) + r.spend
    return acc
  }, {})
  const pieData = Object.entries(byPlatform).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))

  const byPosition = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.platform_position ?? 'unknown'
    acc[key] = (acc[key] || 0) + r.spend
    return acc
  }, {})
  const positionData = Object.entries(byPosition)
    .map(([position, spend]) => ({
      position: cleanPositionName(position),
      spend: Math.round(spend * 100) / 100,
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 12)

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
        Нет данных по плейсментам.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Расход по платформе</p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Расход']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Расход по позиции</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={positionData} margin={{ top: 5, right: 5, left: -10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="position" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Расход']} />
            <Bar dataKey="spend" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Tab: Geo ────────────────────────────────────────────────────────────────

function GeoTab({ data, isLoading }: { data: GeoRow[] | null; isLoading: boolean }) {
  const rows = data ?? []
  const byCountry = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.country ?? 'unknown'
    acc[key] = (acc[key] || 0) + r.spend
    return acc
  }, {})
  const topCountries = Object.entries(byCountry)
    .map(([country, spend]) => ({ country, spend: Math.round(spend * 100) / 100 }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10)

  if (isLoading) {
    return <ChartSkeleton />
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
        Нет географических данных.
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Топ 10 стран по расходу</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={topCountries} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis dataKey="country" type="category" width={50} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Расход']} />
          <Bar dataKey="spend" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Tab: Hourly ─────────────────────────────────────────────────────────────

function HourlyTab({ data, isLoading }: { data: HourlyRow[] | null; isLoading: boolean }) {
  const rows = data ?? []
  const byHour: Record<number, { spend: number; ctr: number; n: number }> = {}
  for (let h = 0; h < 24; h++) byHour[h] = { spend: 0, ctr: 0, n: 0 }
  rows.forEach((r) => {
    const h = r.hour >= 0 && r.hour <= 23 ? r.hour : 0
    byHour[h].spend += r.spend
    byHour[h].ctr += r.ctr
    byHour[h].n += 1
  })
  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    spend: Math.round(byHour[h].spend * 100) / 100,
    ctr: byHour[h].n ? byHour[h].ctr / byHour[h].n : 0,
  }))

  if (isLoading) {
    return <ChartSkeleton />
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
        Нет почасовых данных.
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Расход и CTR по часу суток</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={hourlyData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v, name) =>
              name === 'spend' ? [formatCurrency(Number(v)), 'Расход'] : [formatPercent(Number(v)), 'CTR']
            }
          />
          <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => (v === 'spend' ? 'Расход' : 'CTR')} />
          <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} dot={false} name="spend" />
          <Line yAxisId="right" type="monotone" dataKey="ctr" stroke="#10b981" strokeWidth={2} dot={false} name="ctr" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const TAB_API: Record<Exclude<TabId, 'overview' | 'reach' | 'video'>, string> = {
  adsets: '/api/meta/adsets',
  demographics: '/api/meta/demographics',
  placements: '/api/meta/placements',
  geo: '/api/meta/geo',
  hourly: '/api/meta/hourly',
}

export function CampaignDetailModal({ campaign, accountId, accountName, dateFrom, dateTo, dailyInsights, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [tabData, setTabData] = useState<TabDataState>(initialTabData)
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']))
  const [loadingTab, setLoadingTab] = useState<TabId | null>(null)

  const campaignName = campaign.campaign_name

  // Lazy fetch: when switching to a tab that isn't loaded yet, fetch and cache in tabData (overview, reach, video use dailyInsights — no fetch)
  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'reach' || activeTab === 'video') return
    if (loadedTabs.has(activeTab)) return
    if (loadingTab !== null) return

    setLoadingTab(activeTab)
    const params = new URLSearchParams({ accountId, dateFrom, dateTo, campaignName })
    const url = `${TAB_API[activeTab]}?${params}`

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const data = d.data ?? []
        setTabData((prev) => ({ ...prev, [activeTab]: data }))
        setLoadedTabs((prev) => new Set([...prev, activeTab]))
      })
      .catch(() => {
        setTabData((prev) => ({ ...prev, [activeTab]: [] }))
        setLoadedTabs((prev) => new Set([...prev, activeTab]))
      })
      .finally(() => setLoadingTab(null))
  }, [activeTab, loadedTabs, loadingTab, accountId, campaignName, dateFrom, dateTo])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const formattedFrom = (() => {
    try { return format(new Date(dateFrom), 'd MMM yyyy', { locale: ru }) } catch { return dateFrom }
  })()
  const formattedTo = (() => {
    try { return format(new Date(dateTo), 'd MMM yyyy', { locale: ru }) } catch { return dateTo }
  })()

  const hasVideoData = dailyInsights.some(
    (r) => r.campaign_name === campaignName && (r.video_p25_watched ?? 0) > 0
  )
  const tabsToShow = TABS.filter((tab) => tab.id !== 'video' || hasVideoData)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.80)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative flex flex-col rounded-xl overflow-hidden w-full max-w-4xl max-h-[85vh]"
          style={{
            background: '#0d0d14',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex-shrink-0 flex items-start justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="min-w-0 flex-1 pr-3">
              <h2 className="text-lg font-semibold text-white leading-tight truncate">{campaign.campaign_name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400">{accountName}</span>
                <span className="text-slate-600 text-xs">·</span>
                <span className="text-xs text-slate-500">{formattedFrom} — {formattedTo}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs nav */}
          <div
            className="flex-shrink-0 flex items-center gap-1 px-4 py-1.5 overflow-x-auto"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {tabsToShow.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={
                  activeTab === tab.id
                    ? { background: 'rgba(59,130,246,0.18)', color: '#60a5fa' }
                    : { color: '#64748b' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content — scrollable; data from tabData cache, loading from loadingTab */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            {activeTab === 'overview' && (
              <OverviewTab campaign={campaign} dailyInsights={dailyInsights} />
            )}
            {activeTab === 'reach' && (
              <ReachTab campaign={campaign} dailyInsights={dailyInsights} />
            )}
            {activeTab === 'video' && (
              <VideoTab campaign={campaign} dailyInsights={dailyInsights} />
            )}
            {activeTab === 'adsets' && (
              <AdsetsTab data={tabData.adsets} isLoading={loadingTab === 'adsets'} />
            )}
            {activeTab === 'demographics' && (
              <DemographicsTab data={tabData.demographics} isLoading={loadingTab === 'demographics'} />
            )}
            {activeTab === 'placements' && (
              <PlacementsTab data={tabData.placements} isLoading={loadingTab === 'placements'} />
            )}
            {activeTab === 'geo' && (
              <GeoTab data={tabData.geo} isLoading={loadingTab === 'geo'} />
            )}
            {activeTab === 'hourly' && (
              <HourlyTab data={tabData.hourly} isLoading={loadingTab === 'hourly'} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
