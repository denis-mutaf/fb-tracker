import { NextRequest, NextResponse } from 'next/server'
import { fetchMetaAds, fetchMetaAdInsights } from '@/lib/meta-api'

/**
 * GET /api/meta/ads?adsetId=xxx&accountId=xxx&dateFrom=xxx&dateTo=xxx
 * Returns ads for the ad set from Meta API (live, not stored).
 * Each ad includes creative and aggregated metrics for the date range.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const adsetId = searchParams.get('adsetId')
  const accountId = searchParams.get('accountId')
  const dateFrom = searchParams.get('dateFrom') ?? undefined
  const dateTo = searchParams.get('dateTo') ?? undefined

  if (!adsetId) {
    return NextResponse.json({ error: 'adsetId is required' }, { status: 400 })
  }

  try {
    const ads = await fetchMetaAds(adsetId)

    const adsWithMetrics = await Promise.all(
      ads.map(async (ad) => {
        let spend = 0
        let impressions = 0
        let clicks = 0
        let ctr = 0
        let cpc = 0
        try {
          const insights = await fetchMetaAdInsights(ad.id, dateFrom, dateTo)
          for (const row of insights) {
            spend += parseFloat(row.spend) || 0
            impressions += parseInt(row.impressions, 10) || 0
            clicks += parseInt(row.clicks, 10) || 0
            ctr += parseFloat(row.ctr) || 0
            cpc += parseFloat(row.cpc) || 0
          }
          const n = insights.length
          if (n > 0) {
            ctr = ctr / n
            cpc = cpc / n
          }
        } catch {
          // leave metrics at 0
        }
        return {
          id: ad.id,
          name: ad.name,
          status: ad.status,
          creative: ad.creative,
          spend,
          impressions,
          clicks,
          ctr,
          cpc,
        }
      })
    )

    return NextResponse.json({ data: adsWithMetrics })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
