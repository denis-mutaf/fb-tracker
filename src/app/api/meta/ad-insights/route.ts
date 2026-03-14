import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/meta/ad-insights?accountId=xxx&adId=xxx&dateFrom=yyyy-mm-dd&dateTo=yyyy-mm-dd
 * Returns daily ad-level insights from Supabase (meta_ad_insights).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const adId = searchParams.get('adId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  if (!accountId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
  if (!adId) return NextResponse.json({ error: 'adId is required' }, { status: 400 })
  if (!dateFrom) return NextResponse.json({ error: 'dateFrom is required' }, { status: 400 })
  if (!dateTo) return NextResponse.json({ error: 'dateTo is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('meta_ad_insights')
    .select('*')
    .eq('account_id', accountId)
    .eq('ad_id', adId)
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

