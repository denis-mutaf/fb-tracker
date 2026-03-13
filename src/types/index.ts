export interface MetaAdAccount {
  id: string
  account_id: string
  account_name: string
  account_currency: string
  is_active: boolean
  created_at: string
}

export interface CampaignInsight {
  id: string
  account_id: string
  campaign_id: string | null
  campaign_name: string
  date: string
  spend: number
  impressions: number
  clicks: number
  results: number
  cost_per_result: number
  cpm: number
  cpc: number
  ctr: number
  account_currency: string
  fetched_at: string
  reach?: number
  frequency?: number
  video_p25_watched?: number
  video_p50_watched?: number
  video_p75_watched?: number
  video_p100_watched?: number
  video_thruplay?: number
}

export interface AlertRule {
  id: string
  account_id: string
  metric: 'cost_per_result' | 'ctr' | 'cpm' | 'cpc' | 'spend' | 'results'
  operator: 'above' | 'below'
  threshold: number
  label: string | null
  is_active: boolean
  created_at: string
}

export interface AiReport {
  id: string
  account_id: string
  report_date: string
  report_text: string
  alerts: AlertFired[]
  created_at: string
}

export interface AlertFired {
  rule_id: string
  label: string
  metric: string
  operator: string
  threshold: number
  actual_value: number
  campaign_name: string
}

export interface SyncResult {
  success: boolean
  rows_synced: number
  error?: string
}

export interface InsightsQuery {
  accountId: string
  dateFrom: string
  dateTo: string
  groupBy?: 'day' | 'campaign'
}

export interface DashboardMetrics {
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  avgCtr: number
  avgCpc: number
  avgCostPerResult: number
  totalResults: number
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type MetricKey = 'cost_per_result' | 'ctr' | 'cpm' | 'cpc' | 'spend' | 'results'

export const METRIC_LABELS: Record<MetricKey, string> = {
  cost_per_result: 'Цена за результат',
  ctr: 'CTR (%)',
  cpm: 'CPM',
  cpc: 'CPC',
  spend: 'Расход',
  results: 'Результаты',
}

export const ACCOUNTS: MetaAdAccount[] = [
  {
    id: '1',
    account_id: 'act_1478794733204244',
    account_name: 'Anver Textil',
    account_currency: 'USD',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    account_id: 'act_1160997135477649',
    account_name: 'Denis Cosarnii',
    account_currency: 'USD',
    is_active: true,
    created_at: new Date().toISOString(),
  },
]
