import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { subDays, format } from 'date-fns'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { accountId, messages } = await req.json()

    const today = new Date()
    const dateFrom = format(subDays(today, 30), 'yyyy-MM-dd')
    const dateTo = format(today, 'yyyy-MM-dd')

    const [
      insightsRes,
      alertsRes,
      adsetRes,
      demographicRes,
      placementRes,
      geoRes,
      adInsightsRes,
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
        .from('meta_adset_insights')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: true }),
      supabaseAdmin
        .from('meta_demographic_insights')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('spend', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('meta_placement_insights')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: true }),
      supabaseAdmin
        .from('meta_geo_insights')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('spend', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('meta_ad_insights')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('spend', { ascending: false })
        .limit(20),
    ])

    const systemPrompt = `Ты — AI-ассистент для анализа рекламных кампаний Meta (Facebook/Instagram Ads).
У тебя есть доступ к актуальным данным из базы за последние 30 дней.

ДАННЫЕ КАМПАНИЙ (${dateFrom} — ${dateTo}):
${JSON.stringify(insightsRes.data || [], null, 2)}

ПРАВИЛА АЛЕРТОВ:
${JSON.stringify(alertsRes.data || [], null, 2)}

ДАННЫЕ ПО АДСЕТАМ:
${JSON.stringify(adsetRes.data || [], null, 2)}

ДЕМОГРАФИЯ (топ по расходу):
${JSON.stringify(demographicRes.data || [], null, 2)}

ПЛЕЙСМЕНТЫ:
${JSON.stringify(placementRes.data || [], null, 2)}

ГЕОГРАФИЯ (топ 10):
${JSON.stringify(geoRes.data || [], null, 2)}

ОБЪЯВЛЕНИЯ (ad-level инсайты, топ 20 по расходу):
${JSON.stringify(adInsightsRes.data || [], null, 2)}

При анализе учитывай демографию (какой возраст/пол конвертирует лучше), плейсменты (какая платформа эффективнее), географию (откуда приходят результаты), и частоту показов (frequency > 3.0 = выгорание аудитории).

Отвечай на русском языке, кратко и по делу. Используй эмодзи для наглядности.
При необходимости ссылайся на конкретные кампании и даты из данных.`

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: messages as { role: 'user' | 'assistant'; content: string }[],
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            )
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
