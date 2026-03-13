'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CampaignInsight } from '@/types'

const tooltipStyle = {
  backgroundColor: '#1a1a26',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#f1f5f9',
  fontSize: '12px',
}

const formatDate = (date: unknown) => {
  try {
    return format(parseISO(String(date)), 'd MMM', { locale: ru })
  } catch {
    return String(date)
  }
}

interface ChartProps {
  data: CampaignInsight[]
}

export function SpendChart({ data }: ChartProps) {
  const grouped = data.reduce<Record<string, number>>((acc, row) => {
    acc[row.date] = (acc[row.date] || 0) + row.spend
    return acc
  }, {})

  const chartData = Object.entries(grouped).map(([date, spend]) => ({
    date,
    spend: Math.round(spend * 100) / 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Расход']}
          labelFormatter={formatDate}
        />
        <Area type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} fill="url(#spendGradient)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function CpcCprChart({ data }: ChartProps) {
  const grouped = data.reduce<Record<string, { cpc: number[]; cpr: number[] }>>((acc, row) => {
    if (!acc[row.date]) acc[row.date] = { cpc: [], cpr: [] }
    acc[row.date].cpc.push(row.cpc)
    acc[row.date].cpr.push(row.cost_per_result)
    return acc
  }, {})

  const chartData = Object.entries(grouped).map(([date, vals]) => ({
    date,
    cpc: vals.cpc.length ? Math.round((vals.cpc.reduce((a, b) => a + b) / vals.cpc.length) * 100) / 100 : 0,
    cpr: vals.cpr.length ? Math.round((vals.cpr.reduce((a, b) => a + b) / vals.cpr.length) * 100) / 100 : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name === 'cpc' ? 'CPC' : 'Цена/результат']}
          labelFormatter={formatDate}
        />
        <Legend formatter={(v) => v === 'cpc' ? 'CPC' : 'Цена/результат'} wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="cpc" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="cpr" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ResultsByCampaignChart({ data }: ChartProps) {
  const grouped = data.reduce<Record<string, number>>((acc, row) => {
    acc[row.campaign_name] = (acc[row.campaign_name] || 0) + row.results
    return acc
  }, {})

  const chartData = Object.entries(grouped)
    .map(([name, results]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, results }))
    .sort((a, b) => b.results - a.results)
    .slice(0, 8)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [Number(v), 'Результаты']}
        />
        <Bar dataKey="results" fill="#3b82f6" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ImpressionsClicksChart({ data }: ChartProps) {
  const grouped = data.reduce<Record<string, { impressions: number; clicks: number }>>((acc, row) => {
    if (!acc[row.date]) acc[row.date] = { impressions: 0, clicks: 0 }
    acc[row.date].impressions += row.impressions
    acc[row.date].clicks += row.clicks
    return acc
  }, {})

  const chartData = Object.entries(grouped).map(([date, vals]) => ({ date, ...vals }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="impressionsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v, name) => [Number(v).toLocaleString('ru'), name === 'impressions' ? 'Показы' : 'Клики']}
          labelFormatter={formatDate}
        />
        <Legend formatter={(v) => v === 'impressions' ? 'Показы' : 'Клики'} wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="impressions" stroke="#8b5cf6" strokeWidth={2} fill="url(#impressionsGradient)" dot={false} />
        <Area type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} fill="url(#clicksGradient)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
