import { subDays, format } from 'date-fns'

const META_GRAPH_URL = 'https://graph.facebook.com/v25.0'
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!

export interface MetaInsightRow {
  campaign_id: string
  campaign_name: string
  adset_id?: string
  adset_name?: string
  ad_id?: string
  ad_name?: string
  date_start: string
  spend: string
  impressions: string
  clicks: string
  cpm: string
  cpc: string
  ctr: string
  account_currency: string
  actions?: Array<{ action_type: string; value: string }>
  reach?: string
  frequency?: string
  video_p25_watched_actions?: Array<{ action_type: string; value: string }>
  video_p50_watched_actions?: Array<{ action_type: string; value: string }>
  video_p75_watched_actions?: Array<{ action_type: string; value: string }>
  video_p100_watched_actions?: Array<{ action_type: string; value: string }>
  video_thruplay_watched_actions?: Array<{ action_type: string; value: string }>
}

export interface MetaInsightsResponse {
  data: MetaInsightRow[]
  paging?: {
    cursors?: { before: string; after: string }
    next?: string
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchWithRetry(url: string, retries = 3): Promise<MetaInsightsResponse> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      await sleep(Math.pow(2, attempt) * 1000)
    }

    const response = await fetch(url)

    if (response.status === 429) {
      await sleep(Math.pow(2, attempt + 1) * 2000)
      continue
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: { message: response.statusText } }))
      lastError = new Error(errData?.error?.message || `HTTP ${response.status}`)
      if (response.status >= 500) continue
      throw lastError
    }

    return response.json()
  }

  throw lastError || new Error('Max retries exceeded')
}

export async function fetchMetaInsights(
  accountId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaInsightRow[]> {
  const today = new Date()
  const since = dateFrom || format(subDays(today, 7), 'yyyy-MM-dd')
  const until = dateTo || format(today, 'yyyy-MM-dd')

  const fields = [
    'campaign_name',
    'campaign_id',
    'spend',
    'impressions',
    'clicks',
    'cpm',
    'cpc',
    'ctr',
    'account_currency',
    'actions',
    'reach',
    'frequency',
    'video_p25_watched_actions',
    'video_p50_watched_actions',
    'video_p75_watched_actions',
    'video_p100_watched_actions',
    'video_thruplay_watched_actions',
  ].join(',')

  const timeRange = JSON.stringify({ since, until })

  const baseUrl = `${META_GRAPH_URL}/${accountId}/insights?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&level=campaign&time_increment=1&access_token=${ACCESS_TOKEN}`

  const allRows: MetaInsightRow[] = []
  let nextUrl: string | undefined = baseUrl

  while (nextUrl) {
    const data = await fetchWithRetry(nextUrl)
    allRows.push(...data.data)

    nextUrl = data.paging?.next
    if (nextUrl) {
      await sleep(300)
    }
  }

  return allRows
}

/**
 * Fetch ad-level insights for an account (level=ad, time_increment=1).
 * Returned rows include campaign/adset/ad identifiers and names.
 */
export async function fetchMetaAdInsights(
  accountId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaInsightRow[]> {
  const today = new Date()
  const since = dateFrom || format(subDays(today, 7), 'yyyy-MM-dd')
  const until = dateTo || format(today, 'yyyy-MM-dd')

  const fields = [
    'campaign_name',
    'campaign_id',
    'adset_name',
    'adset_id',
    'ad_name',
    'ad_id',
    'spend',
    'impressions',
    'clicks',
    'cpm',
    'cpc',
    'ctr',
    'account_currency',
    'actions',
    'reach',
    'frequency',
    'video_p25_watched_actions',
    'video_p50_watched_actions',
    'video_p75_watched_actions',
    'video_p100_watched_actions',
    'video_thruplay_watched_actions',
  ].join(',')

  const timeRange = JSON.stringify({ since, until })
  const baseUrl = `${META_GRAPH_URL}/${accountId}/insights?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&level=ad&time_increment=1&access_token=${ACCESS_TOKEN}`

  const allRows: MetaInsightRow[] = []
  let nextUrl: string | undefined = baseUrl

  while (nextUrl) {
    const data = await fetchWithRetry(nextUrl)
    allRows.push(...data.data)
    nextUrl = data.paging?.next
    if (nextUrl) await sleep(300)
  }

  return allRows
}

export interface MetaAdsetInsightRow {
  adset_id: string
  adset_name: string
  campaign_id: string
  campaign_name: string
  date_start: string
  spend: string
  impressions: string
  clicks: string
  cpm: string
  cpc: string
  ctr: string
  account_currency: string
  actions?: Array<{ action_type: string; value: string }>
  reach?: string
  frequency?: string
  video_p25_watched_actions?: Array<{ action_type: string; value: string }>
  video_p50_watched_actions?: Array<{ action_type: string; value: string }>
  video_p75_watched_actions?: Array<{ action_type: string; value: string }>
  video_p100_watched_actions?: Array<{ action_type: string; value: string }>
  video_thruplay_watched_actions?: Array<{ action_type: string; value: string }>
}

export interface MetaAdsetInsightsResponse {
  data: MetaAdsetInsightRow[]
  paging?: { next?: string }
}

async function fetchWithRetryAdset(url: string, retries = 3): Promise<MetaAdsetInsightsResponse> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await sleep(Math.pow(2, attempt) * 1000)
    const response = await fetch(url)
    if (response.status === 429) {
      await sleep(Math.pow(2, attempt + 1) * 2000)
      continue
    }
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: { message: response.statusText } }))
      lastError = new Error(errData?.error?.message || `HTTP ${response.status}`)
      if (response.status >= 500) continue
      throw lastError
    }
    return response.json()
  }
  throw lastError || new Error('Max retries exceeded')
}

export async function fetchMetaAdsetInsights(
  accountId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaAdsetInsightRow[]> {
  const today = new Date()
  const since = dateFrom || format(subDays(today, 7), 'yyyy-MM-dd')
  const until = dateTo || format(today, 'yyyy-MM-dd')
  const fields = [
    'adset_id',
    'adset_name',
    'campaign_id',
    'campaign_name',
    'spend',
    'impressions',
    'clicks',
    'cpm',
    'cpc',
    'ctr',
    'account_currency',
    'actions',
    'reach',
    'frequency',
    'video_p25_watched_actions',
    'video_p50_watched_actions',
    'video_p75_watched_actions',
    'video_p100_watched_actions',
    'video_thruplay_watched_actions',
  ].join(',')
  const timeRange = JSON.stringify({ since, until })
  const baseUrl = `${META_GRAPH_URL}/${accountId}/insights?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&level=adset&time_increment=1&access_token=${ACCESS_TOKEN}`

  const allRows: MetaAdsetInsightRow[] = []
  let nextUrl: string | undefined = baseUrl
  while (nextUrl) {
    const data = await fetchWithRetryAdset(nextUrl)
    allRows.push(...data.data)
    nextUrl = data.paging?.next
    if (nextUrl) await sleep(300)
  }
  return allRows
}

export function extractResults(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions || actions.length === 0) return 0

  const resultActionTypes = [
    'lead',
    'offsite_conversion.fb_pixel_lead',
    'omni_complete_registration',
    'complete_registration',
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
    'omni_purchase',
  ]

  let total = 0
  for (const action of actions) {
    if (resultActionTypes.some((t) => action.action_type.includes(t))) {
      total += parseFloat(action.value) || 0
    }
  }

  if (total === 0) {
    for (const action of actions) {
      total += parseFloat(action.value) || 0
    }
  }

  return Math.round(total)
}

// --- Breakdown insights (generic row with optional dimension keys) ---
export interface MetaBreakdownRow {
  campaign_id?: string
  campaign_name: string
  date_start: string
  spend: string
  impressions: string
  clicks: string
  cpm?: string
  cpc?: string
  ctr?: string
  account_currency?: string
  actions?: Array<{ action_type: string; value: string }>
  age?: string
  gender?: string
  publisher_platform?: string
  platform_position?: string
  country?: string
  region?: string
  hour?: number
}

export interface MetaBreakdownResponse {
  data: MetaBreakdownRow[]
  paging?: { next?: string }
}

async function fetchWithRetryBreakdown(url: string, retries = 3): Promise<MetaBreakdownResponse> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await sleep(Math.pow(2, attempt) * 1000)
    const response = await fetch(url)
    if (response.status === 429) {
      await sleep(Math.pow(2, attempt + 1) * 2000)
      continue
    }
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: { message: response.statusText } }))
      lastError = new Error(errData?.error?.message || `HTTP ${response.status}`)
      if (response.status >= 500) continue
      throw lastError
    }
    return response.json()
  }
  throw lastError || new Error('Max retries exceeded')
}

function buildBreakdownUrl(
  accountId: string,
  breakdowns: string,
  dateFrom?: string,
  dateTo?: string
): string {
  const today = new Date()
  const since = dateFrom || format(subDays(today, 7), 'yyyy-MM-dd')
  const until = dateTo || format(today, 'yyyy-MM-dd')
  const fields = 'campaign_name,campaign_id,spend,impressions,clicks,cpm,cpc,ctr,account_currency,actions'
  const timeRange = JSON.stringify({ since, until })
  return `${META_GRAPH_URL}/${accountId}/insights?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&level=campaign&time_increment=1&breakdowns=${encodeURIComponent(breakdowns)}&access_token=${ACCESS_TOKEN}`
}

export async function fetchMetaDemographicInsights(
  accountId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaBreakdownRow[]> {
  const allRows: MetaBreakdownRow[] = []
  let nextUrl: string | undefined = buildBreakdownUrl(accountId, 'age,gender', dateFrom, dateTo)
  while (nextUrl) {
    const data = await fetchWithRetryBreakdown(nextUrl)
    allRows.push(...data.data)
    nextUrl = data.paging?.next
    if (nextUrl) await sleep(300)
  }
  return allRows
}

export async function fetchMetaPlacementInsights(
  accountId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaBreakdownRow[]> {
  const allRows: MetaBreakdownRow[] = []
  let nextUrl: string | undefined = buildBreakdownUrl(accountId, 'publisher_platform,platform_position', dateFrom, dateTo)
  while (nextUrl) {
    const data = await fetchWithRetryBreakdown(nextUrl)
    allRows.push(...data.data)
    nextUrl = data.paging?.next
    if (nextUrl) await sleep(300)
  }
  return allRows
}

export async function fetchMetaGeoInsights(
  accountId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaBreakdownRow[]> {
  const allRows: MetaBreakdownRow[] = []
  let nextUrl: string | undefined = buildBreakdownUrl(accountId, 'country,region', dateFrom, dateTo)
  while (nextUrl) {
    const data = await fetchWithRetryBreakdown(nextUrl)
    allRows.push(...data.data)
    nextUrl = data.paging?.next
    if (nextUrl) await sleep(300)
  }
  return allRows
}

export async function fetchMetaHourlyInsights(
  accountId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaBreakdownRow[]> {
  const allRows: MetaBreakdownRow[] = []
  const breakdown = 'hourly_stats_aggregated_by_advertiser_time_zone'
  let nextUrl: string | undefined = buildBreakdownUrl(accountId, breakdown, dateFrom, dateTo)
  while (nextUrl) {
    const data = await fetchWithRetryBreakdown(nextUrl)
    allRows.push(...data.data)
    nextUrl = data.paging?.next
    if (nextUrl) await sleep(300)
  }
  return allRows
}

// --- Ads (live from Meta API) ---

export interface MetaAdCreative {
  id: string
  title?: string
  body?: string
  thumbnail_url?: string
  image_url?: string
}

export interface MetaAdNode {
  id: string
  name: string
  status: string
  creative?: MetaAdCreative
}

export interface MetaAdsResponse {
  data: MetaAdNode[]
  paging?: { next?: string }
}

export async function fetchMetaAds(adsetId: string): Promise<MetaAdNode[]> {
  const fields = 'id,name,status,creative{id,title,body,thumbnail_url,image_url}'
  const all: MetaAdNode[] = []
  let url: string | undefined = `${META_GRAPH_URL}/${adsetId}/ads?fields=${fields}&access_token=${ACCESS_TOKEN}`

  while (url) {
    const res = await fetch(url)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `HTTP ${res.status}`)
    }
    const data: MetaAdsResponse = await res.json()
    all.push(...(data.data || []))
    url = data.paging?.next
    if (url) await sleep(300)
  }
  return all
}

export interface MetaAdInsightRow {
  ad_id: string
  date_start: string
  spend: string
  impressions: string
  clicks: string
  cpm: string
  cpc: string
  ctr: string
}

export interface MetaAdInsightsResponse {
  data: MetaAdInsightRow[]
}

/**
 * Fetch per-ad daily insights by ad id (Meta Graph: /{adId}/insights).
 * Used for lightweight "ads list" metrics (not stored).
 */
export async function fetchMetaAdInsightsByAdId(
  adId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MetaAdInsightRow[]> {
  const today = new Date()
  const since = dateFrom || format(subDays(today, 30), 'yyyy-MM-dd')
  const until = dateTo || format(today, 'yyyy-MM-dd')
  const timeRange = JSON.stringify({ since, until })
  const fields = 'spend,impressions,clicks,cpm,cpc,ctr'
  const url = `${META_GRAPH_URL}/${adId}/insights?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&access_token=${ACCESS_TOKEN}`

  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `HTTP ${res.status}`)
  }
  const data: MetaAdInsightsResponse = await res.json()
  return data.data || []
}

export interface MetaAdPreviewNode {
  body?: string
}

export interface MetaAdPreviewResponse {
  data?: MetaAdPreviewNode[]
}

export async function fetchMetaAdPreview(
  adId: string,
  adFormat: string = 'MOBILE_FEED_STANDARD'
): Promise<string> {
  const url = `${META_GRAPH_URL}/${adId}/previews?ad_format=${encodeURIComponent(adFormat)}&access_token=${ACCESS_TOKEN}`

  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `HTTP ${res.status}`)
  }
  const data: MetaAdPreviewResponse = await res.json()
  const first = data.data?.[0]
  return first?.body ?? ''
}
