import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  

  let query = supabaseAdmin.from('alert_rules').select('*').order('created_at', { ascending: false })
  if (accountId) query = query.eq('account_id', accountId)

  const { data, error } = await query
  console.log('alerts error:', error)
  console.log('alerts data:', data)
  console.log('full response:', JSON.stringify({ data, error }))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, ...payload } = body

  if (action === 'delete') {
    const { error } = await supabaseAdmin.from('alert_rules').delete().eq('id', payload.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'toggle') {
    const { error } = await supabaseAdmin
      .from('alert_rules')
      .update({ is_active: payload.is_active })
      .eq('id', payload.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'create') {
    const { data, error } = await supabaseAdmin
      .from('alert_rules')
      .insert({
        account_id: payload.account_id,
        metric: payload.metric,
        operator: payload.operator,
        threshold: payload.threshold,
        label: payload.label || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
