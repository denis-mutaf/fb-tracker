import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { AlertRule, CampaignInsight, AlertFired } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function checkAlerts(insights: CampaignInsight[], rules: AlertRule[]): AlertFired[] {
  const fired: AlertFired[] = []
  const activeRules = rules.filter((r) => r.is_active)

  for (const rule of activeRules) {
    const campaignMap: Record<string, number[]> = {}

    for (const row of insights) {
      const val = row[rule.metric as keyof CampaignInsight] as number
      if (!campaignMap[row.campaign_name]) campaignMap[row.campaign_name] = []
      campaignMap[row.campaign_name].push(val)
    }

    for (const [campaign, values] of Object.entries(campaignMap)) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      const triggered =
        rule.operator === 'above' ? avg > rule.threshold : avg < rule.threshold

      if (triggered) {
        fired.push({
          rule_id: rule.id,
          label: rule.label || `${rule.metric} ${rule.operator} ${rule.threshold}`,
          metric: rule.metric,
          operator: rule.operator,
          threshold: rule.threshold,
          actual_value: Math.round(avg * 100) / 100,
          campaign_name: campaign,
        })
      }
    }
  }

  return fired
}

export async function POST(req: NextRequest) {
  try {
    const { accountId, dateFrom, dateTo, question } = await req.json()

    const [
      insightsRes,
      alertsRes,
      demographicsRes,
      placementsRes,
      geoRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('meta_campaign_insights')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: true }),
      supabaseAdmin.from('alert_rules').select('*').eq('account_id', accountId),
      supabaseAdmin
        .from('meta_demographic_insights')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('spend', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('meta_placement_insights')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', dateFrom)
        .lte('date', dateTo),
      supabaseAdmin
        .from('meta_geo_insights')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('spend', { ascending: false })
        .limit(10),
    ])

    const insights: CampaignInsight[] = insightsRes.data || []
    const rules: AlertRule[] = alertsRes.data || []
    const firedAlerts = checkAlerts(insights, rules)
    const topDemographics = demographicsRes.data || []
    const placementData = placementsRes.data || []
    const topGeo = geoRes.data || []

    const prompt = `Ты — AI-аналитик рекламных кампаний Meta (Facebook/Instagram Ads).

Тебе даны данные по рекламным кампаниям и пороговые правила (алерты).

ДАННЫЕ (${dateFrom} — ${dateTo}):
${JSON.stringify(insights, null, 2)}

ПРАВИЛА АЛЕРТОВ:
${JSON.stringify(rules, null, 2)}

СРАБОТАВШИЕ АЛЕРТЫ:
${JSON.stringify(firedAlerts, null, 2)}

ДЕМОГРАФИЯ (топ срезы по расходу):
${JSON.stringify(topDemographics, null, 2)}

ПЛЕЙСМЕНТЫ:
${JSON.stringify(placementData, null, 2)}

ГЕОГРАФИЯ (топ 10 стран):
${JSON.stringify(topGeo, null, 2)}

Задача:
1. Проанализируй данные за период
2. Проверь все правила алертов — укажи какие сработали и по каким кампаниям
3. Найди аномалии (резкие скачки/падения метрик)
4. Дай конкретные рекомендации по оптимизации
5. Учитывай демографию, плейсменты и географию при рекомендациях
${question ? `6. Ответь на вопрос пользователя: "${question}"` : ''}

Формат ответа: структурированный отчёт на русском языке.
Используй эмодзи для визуального выделения (🟢 норма, 🔴 проблема, ⚠️ предупреждение).
Используй MCP Сервер Supabase, проект FB Tracker.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
    const firstBlock = message.content[0]
    const reportText =
      firstBlock && firstBlock.type === 'text' ? firstBlock.text : ''

    await supabaseAdmin.from('ai_reports').insert({
      account_id: accountId,
      report_date: dateTo,
      report_text: reportText,
      alerts: firedAlerts,
    })

    return NextResponse.json({ success: true, report: reportText, alerts: firedAlerts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
