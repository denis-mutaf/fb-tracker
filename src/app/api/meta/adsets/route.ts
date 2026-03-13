import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/** Aggregated adset row for table (one per adset). */
export interface AdsetAggregateRow {
  adset_id: string | null
  adset_name: string
  campaign_id: string | null
  campaign_name: string
  total_spend: number
  total_impressions: number
  total_reach: number
  avg_frequency: number
  total_clicks: number
  total_results: number
  avg_ctr: number
  avg_cpc: number
  avg_cost_per_result: number
  days: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const campaignId = searchParams.get('campaignId')
  const campaignName = searchParams.get('campaignName')
  const adsetId = searchParams.get('adsetId')
  const adsetName = searchParams.get('adsetName')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
  }

  if (!campaignId && !campaignName) {
    return NextResponse.json(
      { error: 'campaignId or campaignName is required' },
      { status: 400 }
    )
  }

  let query = supabase
    .from('meta_adset_insights')
    .select('*')
    .eq('account_id', accountId)
    .order('date', { ascending: true })

  if (campaignId) {
    if (/^\d+$/.test(campaignId)) {
      query = query.eq('campaign_id', campaignId)
    } else {
      query = query.eq('campaign_name', decodeURIComponent(campaignId))
    }
  } else if (campaignName) {
    query = query.eq('campaign_name', campaignName)
  }

  if (adsetId) {
    if (/^\d+$/.test(adsetId)) {
      query = query.eq('adset_id', adsetId)
    } else {
      query = query.eq('adset_name', decodeURIComponent(adsetId))
    }
  } else if (adsetName) {
    query = query.eq('adset_name', decodeURIComponent(adsetName))
  }

  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)

  const { data: rows, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const raw = rows ?? []

  // Return raw daily rows if caller needs them; otherwise aggregate by adset for table
  const groupBy = searchParams.get('groupBy')
  if (groupBy === 'adset') {
    const grouped: Record<string, AdsetAggregateRow> = {}
    for (const row of raw) {
      const key = row.adset_name
      if (!grouped[key]) {
        grouped[key] = {
          adset_id: row.adset_id ?? null,
          adset_name: row.adset_name,
          campaign_id: row.campaign_id ?? null,
          campaign_name: row.campaign_name,
          total_spend: 0,
          total_impressions: 0,
          total_reach: 0,
          avg_frequency: 0,
          total_clicks: 0,
          total_results: 0,
          avg_ctr: 0,
          avg_cpc: 0,
          avg_cost_per_result: 0,
          days: 0,
        }
      }
      const g = grouped[key]
      g.total_spend += Number(row.spend ?? 0)
      g.total_impressions += Number(row.impressions ?? 0)
      g.total_reach += Number(row.reach ?? 0)
      g.avg_frequency += Number(row.frequency ?? 0)
      g.total_clicks += Number(row.clicks ?? 0)
      g.total_results += Number(row.results ?? 0)
      g.avg_ctr += Number(row.ctr ?? 0)
      g.avg_cpc += Number(row.cpc ?? 0)
      g.days += 1
    }
    const aggregates = Object.values(grouped).map((c) => {
      const days = c.days || 1
      return {
        ...c,
        avg_frequency: Math.round((c.avg_frequency / days) * 100) / 100,
        avg_ctr: days > 0 ? c.avg_ctr / days : 0,
        avg_cpc: days > 0 ? c.avg_cpc / days : 0,
        avg_cost_per_result: c.total_results > 0 ? c.total_spend / c.total_results : 0,
      }
    })
    return NextResponse.json({ data: aggregates })
  }

  return NextResponse.json({ data: raw })
}
