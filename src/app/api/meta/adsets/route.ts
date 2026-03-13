import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const campaignName = searchParams.get('campaignName')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  if (!accountId || !campaignName) {
    return NextResponse.json(
      { error: 'accountId and campaignName are required' },
      { status: 400 }
    )
  }

  let query = supabase
    .from('meta_adset_insights')
    .select('*')
    .eq('account_id', accountId)
    .eq('campaign_name', campaignName)
    .order('date', { ascending: true })

  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}
