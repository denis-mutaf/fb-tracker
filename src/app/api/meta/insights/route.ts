import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const groupBy = searchParams.get('groupBy') || 'day'

  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
  }

  let query = supabase
    .from('meta_campaign_insights')
    .select('*')
    .eq('account_id', accountId)
    .order('date', { ascending: true })

  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)

  const { data, error } = await query

  console.log('Supabase error:', error)
  console.log('Supabase data length:', data?.length)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (groupBy === 'campaign') {
    const grouped: Record<string, {
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
    }> = {}

    for (const row of data || []) {
      const key = row.campaign_name
      if (!grouped[key]) {
        grouped[key] = {
          campaign_name: row.campaign_name,
          campaign_id: row.campaign_id,
          total_spend: 0,
          total_impressions: 0,
          total_clicks: 0,
          total_results: 0,
          avg_cpm: 0,
          avg_cpc: 0,
          avg_ctr: 0,
          avg_cost_per_result: 0,
          days: 0,
        }
      }
      grouped[key].total_spend += row.spend
      grouped[key].total_impressions += row.impressions
      grouped[key].total_clicks += row.clicks
      grouped[key].total_results += row.results
      grouped[key].avg_cpm += row.cpm
      grouped[key].avg_cpc += row.cpc
      grouped[key].avg_ctr += row.ctr
      grouped[key].days += 1
    }

    const campaigns = Object.values(grouped).map((c) => ({
      ...c,
      avg_cpm: c.days > 0 ? c.avg_cpm / c.days : 0,
      avg_cpc: c.days > 0 ? c.avg_cpc / c.days : 0,
      avg_ctr: c.days > 0 ? c.avg_ctr / c.days : 0,
      avg_cost_per_result: c.total_results > 0 ? c.total_spend / c.total_results : 0,
    }))

    return NextResponse.json({ data: campaigns })
  }

  return NextResponse.json({ data: data || [] })
}


