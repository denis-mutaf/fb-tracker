import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('id, account_id, account_name, account_currency, is_active, created_at')
      .eq('is_active', true)
      .order('account_name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const accounts = (data ?? []).map((row) => ({
      id: row.id,
      account_id: row.account_id,
      account_name: row.account_name,
      account_currency: row.account_currency ?? 'USD',
      is_active: row.is_active ?? true,
      created_at: row.created_at,
    }))

    return NextResponse.json({ data: accounts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
