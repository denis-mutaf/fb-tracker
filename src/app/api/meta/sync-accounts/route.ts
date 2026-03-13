import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const META_GRAPH_URL = 'https://graph.facebook.com/v25.0'
const FIELDS = 'account_id,name,account_currency'

/** Ensure account_id has act_ prefix for consistent storage (Meta may return numeric id only). */
function normalizeAccountId(accountId: string): string {
  const raw = String(accountId ?? '').trim()
  return raw.startsWith('act_') ? raw : `act_${raw}`
}

export async function POST() {
  try {
    const token = process.env.META_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'META_ACCESS_TOKEN is not set' }, { status: 500 })
    }

    const url = `${META_GRAPH_URL}/me/adaccounts?fields=${FIELDS}&access_token=${token}`
    const res = await fetch(url)
    const json = await res.json()

    if (!res.ok) {
      const message = json?.error?.message ?? res.statusText
      return NextResponse.json({ error: message }, { status: res.status >= 500 ? 502 : 400 })
    }

    const raw = json.data ?? []
    const accounts = raw.map(
      (row: { account_id: string; name: string; account_currency?: string }) => ({
        account_id: normalizeAccountId(row.account_id),
        account_name: row.name ?? row.account_id,
        account_currency: row.account_currency ?? 'USD',
        is_active: true,
      })
    )

    if (accounts.length === 0) {
      return NextResponse.json({ success: true, accounts_synced: 0 })
    }

    const { error, count } = await supabaseAdmin
      .from('meta_ad_accounts')
      .upsert(accounts, { onConflict: 'account_id', count: 'exact' })

    if (error) {
      console.error('sync-accounts supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, accounts_synced: count ?? accounts.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('sync-accounts error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
