import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  fetchMetaInsights,
  fetchMetaAdsetInsights,
  fetchMetaAdInsights,
  fetchMetaDemographicInsights,
  fetchMetaPlacementInsights,
  fetchMetaGeoInsights,
  fetchMetaHourlyInsights,
  extractResults,
} from '@/lib/meta-api'

/** Extract integer value from Meta actions array (e.g. video_p25_watched_actions). */
function extractActionValue(actions?: Array<{ action_type: string; value: string }>): number {
  const v = actions?.[0]?.value
  return v != null ? parseInt(String(v), 10) || 0 : 0
}

/** Ensure accountId has act_ prefix for Meta Graph API (e.g. /act_123/insights). */
function normalizeAccountId(accountId: string): string {
  const raw = String(accountId).trim()
  return raw.startsWith('act_') ? raw : `act_${raw}`
}

export async function POST(req: NextRequest) {
  try {
    const { accountId: rawId, dateFrom, dateTo } = await req.json()

    if (!rawId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const accountId = normalizeAccountId(rawId)

    let rows
    try {
      rows = await fetchMetaInsights(accountId, dateFrom, dateTo)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Sync fetchMetaInsights error:', message)
      return NextResponse.json(
        { success: false, error: message, rows_synced: 0 },
        { status: 200 }
      )
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: true, rows_synced: 0 })
    }

    const records = rows.map((row) => {
      const spend = parseFloat(row.spend) || 0
      const results = extractResults(row.actions)
      const costPerResult = results > 0 ? spend / results : 0

      return {
        account_id: accountId,
        campaign_id: row.campaign_id || null,
        campaign_name: row.campaign_name,
        date: row.date_start,
        spend,
        impressions: parseInt(row.impressions) || 0,
        clicks: parseInt(row.clicks) || 0,
        results,
        cost_per_result: costPerResult,
        cpm: parseFloat(row.cpm) || 0,
        cpc: parseFloat(row.cpc) || 0,
        ctr: parseFloat(row.ctr) || 0,
        account_currency: row.account_currency || 'USD',
        fetched_at: new Date().toISOString(),
        reach: parseInt(row.reach ?? '', 10) || 0,
        frequency: parseFloat(row.frequency ?? '') || 0,
        video_p25_watched: extractActionValue(row.video_p25_watched_actions),
        video_p50_watched: extractActionValue(row.video_p50_watched_actions),
        video_p75_watched: extractActionValue(row.video_p75_watched_actions),
        video_p100_watched: extractActionValue(row.video_p100_watched_actions),
        video_thruplay: extractActionValue(row.video_thruplay_watched_actions),
      }
    })

    const { error, count } = await supabaseAdmin
      .from('meta_campaign_insights')
      .upsert(records, {
        onConflict: 'account_id,campaign_name,date',
        count: 'exact',
      })

    if (error) {
      console.error('Supabase upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let totalSynced = count ?? records.length

    try {
      const adsetRows = await fetchMetaAdsetInsights(accountId, dateFrom, dateTo)
      if (adsetRows.length > 0) {
        const adsetRecords = adsetRows.map((row) => {
          const spend = parseFloat(row.spend) || 0
          const results = extractResults(row.actions)
          const costPerResult = results > 0 ? spend / results : 0
          return {
            account_id: accountId,
            campaign_id: row.campaign_id || null,
            campaign_name: row.campaign_name,
            adset_id: row.adset_id || null,
            adset_name: row.adset_name,
            date: row.date_start,
            spend,
            impressions: parseInt(row.impressions) || 0,
            clicks: parseInt(row.clicks) || 0,
            results,
            cost_per_result: costPerResult,
            cpm: parseFloat(row.cpm) || 0,
            cpc: parseFloat(row.cpc) || 0,
            ctr: parseFloat(row.ctr) || 0,
            account_currency: row.account_currency || 'USD',
            fetched_at: new Date().toISOString(),
            reach: parseInt(row.reach ?? '', 10) || 0,
            frequency: parseFloat(row.frequency ?? '') || 0,
            video_p25_watched: extractActionValue(row.video_p25_watched_actions),
            video_p50_watched: extractActionValue(row.video_p50_watched_actions),
            video_p75_watched: extractActionValue(row.video_p75_watched_actions),
            video_p100_watched: extractActionValue(row.video_p100_watched_actions),
            video_thruplay: extractActionValue(row.video_thruplay_watched_actions),
          }
        })
        const { error: adsetError, count: adsetCount } = await supabaseAdmin
          .from('meta_adset_insights')
          .upsert(adsetRecords, {
            onConflict: 'account_id,adset_name,campaign_name,date',
            count: 'exact',
          })
        if (!adsetError) totalSynced += adsetCount ?? adsetRecords.length
      }
    } catch (adsetErr) {
      console.error('Adset sync error (campaign sync succeeded):', adsetErr)
    }

    const runDemographic = async () => {
      const rows = await fetchMetaDemographicInsights(accountId, dateFrom, dateTo)
      if (rows.length === 0) return 0
      const records = rows.map((row) => ({
        account_id: accountId,
        campaign_id: row.campaign_id || null,
        campaign_name: row.campaign_name,
        date: row.date_start,
        age: row.age ?? null,
        gender: row.gender ?? null,
        spend: parseFloat(row.spend) || 0,
        impressions: parseInt(row.impressions) || 0,
        clicks: parseInt(row.clicks) || 0,
        results: extractResults(row.actions),
        cpm: parseFloat(row.cpm ?? '0') || 0,
        cpc: parseFloat(row.cpc ?? '0') || 0,
        ctr: parseFloat(row.ctr ?? '0') || 0,
        fetched_at: new Date().toISOString(),
      }))
      const { error, count } = await supabaseAdmin.from('meta_demographic_insights').upsert(records, { onConflict: 'account_id,campaign_name,date,age,gender', count: 'exact' })
      if (error) { console.error('demographic sync error:', error); return 0 }
      return count ?? records.length
    }
    const runPlacement = async () => {
      const rows = await fetchMetaPlacementInsights(accountId, dateFrom, dateTo)
      if (rows.length === 0) return 0
      const records = rows.map((row) => ({
        account_id: accountId,
        campaign_id: row.campaign_id || null,
        campaign_name: row.campaign_name,
        date: row.date_start,
        publisher_platform: row.publisher_platform ?? null,
        platform_position: row.platform_position ?? null,
        spend: parseFloat(row.spend) || 0,
        impressions: parseInt(row.impressions) || 0,
        clicks: parseInt(row.clicks) || 0,
        results: extractResults(row.actions),
        cpm: parseFloat(row.cpm ?? '0') || 0,
        cpc: parseFloat(row.cpc ?? '0') || 0,
        ctr: parseFloat(row.ctr ?? '0') || 0,
        fetched_at: new Date().toISOString(),
      }))
      const { error, count } = await supabaseAdmin.from('meta_placement_insights').upsert(records, { onConflict: 'account_id,campaign_name,date,publisher_platform,platform_position', count: 'exact' })
      if (error) { console.error('placement sync error:', error); return 0 }
      return count ?? records.length
    }
    const runGeo = async () => {
      const rows = await fetchMetaGeoInsights(accountId, dateFrom, dateTo)
      if (rows.length === 0) return 0
      const records = rows.map((row) => ({
        account_id: accountId,
        campaign_id: row.campaign_id || null,
        campaign_name: row.campaign_name,
        date: row.date_start,
        country: row.country ?? null,
        region: row.region ?? null,
        spend: parseFloat(row.spend) || 0,
        impressions: parseInt(row.impressions) || 0,
        clicks: parseInt(row.clicks) || 0,
        results: extractResults(row.actions),
        cpm: parseFloat(row.cpm ?? '0') || 0,
        cpc: parseFloat(row.cpc ?? '0') || 0,
        ctr: parseFloat(row.ctr ?? '0') || 0,
        fetched_at: new Date().toISOString(),
      }))
      const { error, count } = await supabaseAdmin.from('meta_geo_insights').upsert(records, { onConflict: 'account_id,campaign_name,date,country,region', count: 'exact' })
      if (error) { console.error('geo sync error:', error); return 0 }
      return count ?? records.length
    }
    const runHourly = async () => {
      const rows = await fetchMetaHourlyInsights(accountId, dateFrom, dateTo)
      if (rows.length === 0) return 0
      const records = rows.map((row) => {
        const hourRaw = row.hour !== undefined && row.hour !== null ? (typeof row.hour === 'string' ? parseInt(row.hour, 10) : row.hour) : 0
        const hourNum = Number.isNaN(hourRaw) ? 0 : Math.max(0, Math.min(23, hourRaw))
        return {
          account_id: accountId,
          campaign_id: row.campaign_id || null,
          campaign_name: row.campaign_name,
          date: row.date_start,
          hour: hourNum,
          spend: parseFloat(row.spend) || 0,
          impressions: parseInt(row.impressions) || 0,
          clicks: parseInt(row.clicks) || 0,
          results: extractResults(row.actions),
          cpm: parseFloat(row.cpm ?? '0') || 0,
          cpc: parseFloat(row.cpc ?? '0') || 0,
          ctr: parseFloat(row.ctr ?? '0') || 0,
          fetched_at: new Date().toISOString(),
        }
      })
      const { error, count } = await supabaseAdmin.from('meta_hourly_insights').upsert(records, { onConflict: 'account_id,campaign_name,date,hour', count: 'exact' })
      if (error) { console.error('hourly sync error:', error); return 0 }
      return count ?? records.length
    }

    const [demographicRes, placementRes, geoRes, hourlyRes] = await Promise.allSettled([runDemographic(), runPlacement(), runGeo(), runHourly()])
    if (demographicRes.status === 'rejected') console.error('demographic sync error:', demographicRes.reason)
    else totalSynced += demographicRes.value
    if (placementRes.status === 'rejected') console.error('placement sync error:', placementRes.reason)
    else totalSynced += placementRes.value
    if (geoRes.status === 'rejected') console.error('geo sync error:', geoRes.reason)
    else totalSynced += geoRes.value
    if (hourlyRes.status === 'rejected') console.error('hourly sync error:', hourlyRes.reason)
    else totalSynced += hourlyRes.value

    // --- Ad-level insights sync (level=ad, stored in meta_ad_insights) ---
    try {
      const adRows = await fetchMetaAdInsights(accountId, dateFrom, dateTo)
      if (adRows.length > 0) {
        const adRecords = adRows
          .map((row) => {
            const spend = parseFloat(row.spend) || 0
            const results = extractResults(row.actions)
            const costPerResult = results > 0 ? spend / results : 0

            const campaignName = String(row.campaign_name ?? '').trim()
            const adsetName = String(row.adset_name ?? '').trim()
            const adName = String(row.ad_name ?? '').trim()
            const adId = String(row.ad_id ?? '').trim()

            if (!campaignName || !adsetName || !adName || !adId) return null

            return {
              account_id: accountId,
              campaign_id: row.campaign_id || null,
              campaign_name: campaignName,
              adset_id: row.adset_id || null,
              adset_name: adsetName,
              ad_id: adId,
              ad_name: adName,
              date: row.date_start,
              spend,
              impressions: parseInt(row.impressions) || 0,
              clicks: parseInt(row.clicks) || 0,
              results,
              cost_per_result: costPerResult,
              cpm: parseFloat(row.cpm) || 0,
              cpc: parseFloat(row.cpc) || 0,
              ctr: parseFloat(row.ctr) || 0,
              reach: parseInt(row.reach ?? '', 10) || 0,
              frequency: parseFloat(row.frequency ?? '') || 0,
              video_p25_watched: extractActionValue(row.video_p25_watched_actions),
              video_p50_watched: extractActionValue(row.video_p50_watched_actions),
              video_p75_watched: extractActionValue(row.video_p75_watched_actions),
              video_p100_watched: extractActionValue(row.video_p100_watched_actions),
              video_thruplay: extractActionValue(row.video_thruplay_watched_actions),
              account_currency: row.account_currency || 'USD',
              fetched_at: new Date().toISOString(),
            }
          })
          .filter(Boolean)

        if (adRecords.length > 0) {
          const { error: adError, count: adCount } = await supabaseAdmin
            .from('meta_ad_insights')
            .upsert(adRecords, {
              onConflict: 'account_id,ad_id,date',
              count: 'exact',
            })
          if (adError) console.error('ad insights sync error:', adError)
          else totalSynced += adCount ?? adRecords.length
        }
      }
    } catch (adErr) {
      console.error('Ad insights sync error (other syncs succeeded):', adErr)
    }

    return NextResponse.json({ success: true, rows_synced: totalSynced })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Sync error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
