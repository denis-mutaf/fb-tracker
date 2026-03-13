import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'
import { subDays, format } from 'date-fns'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { accountId, messages } = await req.json()

    const today = new Date()
    const dateFrom = format(subDays(today, 30), 'yyyy-MM-dd')
    const dateTo = format(today, 'yyyy-MM-dd')

    const [insightsRes, alertsRes] = await Promise.all([
      supabaseAdmin
        .from('meta_campaign_insights')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: true }),
      supabaseAdmin.from('alert_rules').select('*').eq('account_id', accountId),
    ])

    const systemPrompt = `Ты — AI-ассистент для анализа рекламных кампаний Meta (Facebook/Instagram Ads).
У тебя есть доступ к актуальным данным из базы за последние 30 дней.

ДАННЫЕ КАМПАНИЙ (${dateFrom} — ${dateTo}):
${JSON.stringify(insightsRes.data || [], null, 2)}

ПРАВИЛА АЛЕРТОВ:
${JSON.stringify(alertsRes.data || [], null, 2)}

Отвечай на русском языке, кратко и по делу. Используй эмодзи для наглядности.
При необходимости ссылайся на конкретные кампании и даты из данных.`

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 1500,
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
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
