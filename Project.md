# LeadLeap — Документация проекта

**LeadLeap** — дашборд для трекинга рекламных кампаний Meta (Facebook/Instagram Ads) с подключением к Meta Marketing API, хранением данных в Supabase, интерактивными графиками и AI-аналитикой.

---

## Стек технологий

| Категория | Технология |
|-----------|------------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Стили | Tailwind CSS v4 |
| UI | shadcn/ui, Radix UI |
| Графики | Recharts |
| БД | Supabase (PostgreSQL) |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| Markdown (AI) | react-markdown, remark-gfm, @tailwindcss/typography |
| Состояние | Zustand (persist) |
| Анимации | Framer Motion |
| Деплой | Vercel |

---

## Структура проекта

```
leadleap/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Dashboard
│   │   ├── globals.css
│   │   ├── campaigns/
│   │   │   ├── layout.tsx           # AnimatePresence + motion: переходы страниц (opacity, y)
│   │   │   ├── page.tsx             # Список кампаний (таблица, переход в drill-down)
│   │   │   ├── [campaignId]/page.tsx    # Детали кампании: метрики, график, таблица адсетов
│   │   │   └── [campaignId]/[adsetId]/page.tsx  # Детали адсета: метрики, графики, вкладки, объявления (список + раскрытие ad-level инсайтов)
│   │   ├── chat/page.tsx            # AI Chat (streaming)
│   │   ├── settings/page.tsx        # Настройки, алерты, токен
│   │   └── api/
│   │       ├── ai/
│   │       │   ├── analyze/route.ts # POST — AI-отчёт по данным + breakdown
│   │       │   └── chat/route.ts   # POST — стриминг чат
│   │       ├── alerts/route.ts      # GET/POST — правила алертов
│   │       └── meta/
│   │           ├── accounts/route.ts      # GET — список аккаунтов
│   │           ├── sync/route.ts          # POST — синк кампаний + adset + breakdown
│   │           ├── sync-all/route.ts      # POST — синк всех аккаунтов (cron)
│   │           ├── sync-accounts/route.ts # POST — синк списка аккаунтов из Meta
│   │           ├── insights/route.ts      # GET — кампании/инсайты
│   │           ├── adsets/route.ts        # GET — ad sets по кампании
│   │           ├── ads/route.ts           # GET — объявления по адсету (live + метрики)
│   │           ├── preview/route.ts       # GET — превью объявления (iframe HTML)
│   │           ├── ad-insights/route.ts   # GET — ad-level инсайты по дням (meta_ad_insights)
│   │           ├── demographics/route.ts  # GET — демография
│   │           ├── placements/route.ts    # GET — плейсменты
│   │           ├── geo/route.ts           # GET — география
│   │           └── hourly/route.ts        # GET — по часам
│   ├── components/
│   │   ├── layout/        # Sidebar, Header
│   │   ├── campaigns/     # Breadcrumbs, таблицы кампаний/адсетов (drill-down, без модала)
│   │   ├── dashboard/     # MetricCard, Charts, DateRangePicker, AiInsightsBlock
│   │   └── ui/            # shadcn: button, card, table, tabs, popover, etc.
│   ├── lib/
│   │   ├── supabase.ts    # supabase + supabaseAdmin
│   │   ├── meta-api.ts    # fetch Meta Insights (campaign, adset, ad, breakdowns), fetchMetaAdInsights, fetchMetaAdInsightsByAdId
│   │   └── utils.ts       # cn, formatCurrency, formatNumber, formatPercent
│   ├── hooks/
│   │   └── use-account.ts # Zustand: selectedAccount, accounts, setAccounts
│   └── types/
│       └── index.ts       # MetaAdAccount, CampaignInsight, AlertRule, etc.
├── supabase/
│   └── migrations/
│       ├── 20250307000000_create_meta_adset_insights.sql
│       ├── 20250307100000_create_meta_breakdown_tables.sql
│       ├── 20250313100000_add_reach_frequency_video_columns.sql
│       └── 20260314120000_create_meta_ad_insights.sql
├── .env.local
├── vercel.json            # Cron: sync-all ежедневно 06:00 UTC
├── next.config.ts
└── package.json
```

---

## Переменные окружения

Файл `.env.local` (не коммитить секреты):

| Переменная | Описание |
|------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon (public) ключ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role ключ (для API routes) |
| `META_ACCESS_TOKEN` | Long-lived токен доступа Meta Marketing API |
| `META_APP_ID` | ID приложения Meta |
| `META_APP_SECRET` | Секрет приложения Meta (опционально) |
| `ANTHROPIC_API_KEY` | Ключ Anthropic для Claude API |
| `CRON_SECRET` | Секрет для защиты `/api/meta/sync-all` при вызове cron |
| `NEXT_PUBLIC_APP_URL` | Полный URL приложения (для sync-all при деплое) |

---

## База данных (Supabase)

### Таблицы

- **meta_ad_accounts** — рекламные аккаунты Meta (`account_id`, `account_name`, `account_currency`, `is_active`).
- **meta_campaign_insights** — инсайты по кампаниям по дням (`account_id`, `campaign_id`, `campaign_name`, `date`, `spend`, `impressions`, `clicks`, `results`, `cost_per_result`, `cpm`, `cpc`, `ctr`, `reach`, `frequency`, `video_p25_watched`, `video_p50_watched`, `video_p75_watched`, `video_p100_watched`, `video_thruplay`). Unique: `(account_id, campaign_name, date)`.
- **meta_adset_insights** — инсайты по ad set по дням (те же метрики + reach, frequency, video_*). Unique: `(account_id, adset_name, campaign_name, date)`.
- **meta_ad_insights** — инсайты по объявлению (ad) по дням (level=ad): `account_id`, `campaign_id`, `campaign_name`, `adset_id`, `adset_name`, `ad_id`, `ad_name`, `date`, те же метрики + reach, frequency, video_*. Unique: `(account_id, ad_id, date)`. Синк в рамках POST `/api/meta/sync`.
- **meta_demographic_insights** — разбивка по возрасту и полу. Unique: `(account_id, campaign_name, date, age, gender)`.
- **meta_placement_insights** — по платформе и позиции. Unique: `(account_id, campaign_name, date, publisher_platform, platform_position)`.
- **meta_geo_insights** — по стране и региону. Unique: `(account_id, campaign_name, date, country, region)`.
- **meta_hourly_insights** — по часу суток (0–23). Unique: `(account_id, campaign_name, date, hour)`.
- **alert_rules** — пороговые правила для алертов (`account_id`, `metric`, `operator`, `threshold`, `label`, `is_active`).
- **ai_reports** — сохранённые AI-отчёты (`account_id`, `report_date`, `report_text`, `alerts` jsonb).

Миграции лежат в `supabase/migrations/`. Третья миграция добавляет в `meta_campaign_insights` и `meta_adset_insights` колонки `reach`, `frequency`, `video_p25_watched`, `video_p50_watched`, `video_p75_watched`, `video_p100_watched`, `video_thruplay`. Таблицы `meta_ad_accounts` и `meta_campaign_insights` (базовые) создаются отдельно при необходимости (см. раздел SQL в настройках приложения или README).

---

## API Routes

### Meta

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/meta/sync` | Синхронизация одного аккаунта: кампании, ad sets, **ad-level инсайты** (meta_ad_insights), демография, плейсменты, гео, по часам. Body: `{ accountId, dateFrom?, dateTo? }`. Возврат: `{ success, rows_synced }` или `{ success: false, error, rows_synced: 0 }` (status 200 при ошибке Meta). |
| POST | `/api/meta/sync-all` | Синк всех активных аккаунтов из `meta_ad_accounts`. Защита: `Authorization: Bearer CRON_SECRET` или Vercel cron. |
| POST | `/api/meta/sync-accounts` | Загрузка списка аккаунтов из Meta `me/adaccounts`, upsert в `meta_ad_accounts`. Перед upsert `account_id` нормализуется: при отсутствии префикса `act_` он добавляется. Возврат: `{ success, accounts_synced }`. |
| GET | `/api/meta/accounts` | Список активных аккаунтов из БД. |
| GET | `/api/meta/insights` | Инсайты. Query: `accountId`, `dateFrom`, `dateTo`, `groupBy` (day \| campaign), `campaignId` (опционально). |
| GET | `/api/meta/adsets` | Ad sets. Query: `accountId`, `campaignId` или `campaignName`, `dateFrom`, `dateTo`, `groupBy=adset` (агрегат), `adsetId`/`adsetName` (опционально). |
| GET | `/api/meta/ads` | Объявления по адсету (live из Meta API + агрегат метрик). Query: `adsetId`, `accountId`, `dateFrom`, `dateTo`. |
| GET | `/api/meta/preview` | Превью объявления (iframe HTML). Query: `adId`, `adFormat` (по умолчанию MOBILE_FEED_STANDARD). |
| GET | `/api/meta/ad-insights` | Ad-level инсайты по дням из БД. Query: `accountId`, `adId`, `dateFrom`, `dateTo`. Данные из `meta_ad_insights`, порядок по дате по возрастанию. |
| GET | `/api/meta/demographics` | Демография. Query: `accountId`, `dateFrom`, `dateTo`, `campaignName` (опционально, через запятую). |
| GET | `/api/meta/placements` | Плейсменты. Те же параметры. |
| GET | `/api/meta/geo` | География. Те же параметры. |
| GET | `/api/meta/hourly` | По часам. Те же параметры. |

### AI

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/ai/analyze` | Генерация AI-отчёта. Body: `{ accountId, dateFrom, dateTo, question? }`. В промпт подставляются кампании, алерты, демография, плейсменты, гео, **ad-level инсайты (топ 20 по spend)**. Результат сохраняется в `ai_reports`. |
| POST | `/api/ai/chat` | Стриминг-чат. Body: `{ accountId, messages }`. В системный промпт подставляются данные кампаний, алерты, адсеты, демография (топ 20), плейсменты, гео (топ 10), **ad-level инсайты (топ 20 по spend)**; инструкция учитывать демографию, плейсменты, географию и частоту (frequency > 3 = выгорание). Ответ — SSE stream. |

### Alerts

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/alerts` | Список правил. Query: `accountId?`. |
| POST | `/api/alerts` | Действия: `action: 'create' \| 'toggle' \| 'delete'` + соответствующие поля. |

---

## Страницы и функциональность

- **Dashboard (`/`)** — сводные метрики (расход, показы, клики, результаты, CTR, CPC, цена за результат), сравнение с предыдущим периодом, графики (расход по дням, CPC/CPR, результаты по кампаниям, показы/клики), блок AI-аналитики (запрос отчёта от Claude, сработавшие алерты). Текст отчёта рендерится как Markdown (react-markdown + remark-gfm): заголовки, списки, таблицы, блоки кода; стили — prose (Tailwind Typography).
- **Кампании** — drill-down навигация как в Meta Ads Manager. Переходы между страницами анимированы (Framer Motion: layout с AnimatePresence, opacity + y). Период хранится в URL (`?dateFrom=…&dateTo=…`).
  - **`/campaigns`** — таблица кампаний (сортировка, алерты, период и аккаунт в URL). Клик по строке → `/campaigns/[campaignId]`. Справа у каждой строки — стрелка (→). Пустое состояние и строки таблицы с `transition-colors duration-150`.
  - **`/campaigns/[campaignId]`** — хлебные крошки (Кампании > {название}), заголовок, период. Метрики: расход, охват, показы, частота, клики, результаты, CTR, CPC, цена/результат. График расхода по дням. Таблица адсетов (частота >3 подсвечена красным; клик → адсет). При загрузке — скелетоны (карточки метрик, 2 графика, 5 строк таблицы). Пустые состояния с `min-h-[300px]`.
  - **`/campaigns/[campaignId]/[adsetId]`** — хлебные крошки, заголовок адсета, период. Метрики и графики: расход по дням, частота по дням (линия «Выгорание» при y=3). При наличии видео — воронка 25%/50%/75%/100%/ThruPlay. Вкладки Демография / Плейсменты / По часам. Блок «Объявления» — список объявлений (превью 60×60, название, статус, метрики, кнопка «Превью»); **клик по строке раскрывает под ней панель (4-й уровень drill-down)** с ad-level инсайтами: карточки метрик (Spend, Impressions, Reach, Frequency, Clicks, Results, CTR, CPC, Cost/Result), график расхода по дням, CTR/CPC по дням, при наличии видео — воронка, график частоты с линией выгорания. Данные подгружаются лениво из GET `/api/meta/ad-insights` при первом раскрытии, кэшируются; одновременно раскрыто не более одного объявления; при загрузке — скелетон.
- **AI Chat (`/chat`)** — чат с Claude по данным аккаунта: кампании, алерты, адсеты, демография (топ 20), плейсменты, гео (топ 10) за последние 30 дней; стриминг ответов, примеры вопросов. Сообщения ассистента рендерятся как Markdown (react-markdown + remark-gfm), таблицы — кастомные компоненты (overflow-x-auto, границы).
- **Настройки (`/settings`)** — индикатор срока действия Meta Access Token, CRUD правил алертов (метрика, оператор, порог, описание), пример SQL для создания таблиц.

---

## Логика синхронизации (Meta API)

- **Кампании:** `GET /{accountId}/insights` с `level=campaign`, `time_increment=1`, поля включают `reach`, `frequency`, `video_p25_watched_actions`, `video_p50_watched_actions`, `video_p75_watched_actions`, `video_p100_watched_actions`, `video_thruplay_watched_actions`. Пагинация по `paging.next`, задержка 300 ms между запросами, при 429 — exponential backoff.
- **Ad sets:** то же с `level=adset`, поля `adset_id`, `adset_name` и те же reach/frequency/video_*.
- **Ads (ad-level):** то же с `level=ad`, поля `ad_id`, `ad_name`, `adset_id`, `adset_name`, `campaign_id`, `campaign_name` и те же метрики; результат пишется в `meta_ad_insights` (upsert по `account_id`, `ad_id`, `date`). Синк выполняется после adset-синка в том же POST `/api/meta/sync`.
- **Video-поля:** приходят как массивы actions `[{ action_type, value }]`; в БД пишется число через `extractActionValue(actions)` — `parseInt(actions?.[0]?.value) || 0`.
- **Breakdowns:** те же поля + параметр `breakdowns`: `age,gender` \| `publisher_platform,platform_position` \| `country,region` \| `hourly_stats_aggregated_by_advertiser_time_zone`. Четыре типа breakdown-синка выполняются параллельно через `Promise.allSettled`; ошибка одного не отменяет остальные.
- **accountId** в запросах к Meta нормализуется: при отсутствии префикса `act_` он добавляется.
- **Результаты (results):** из поля `actions` выбираются типы lead, complete_registration, purchase и др.; при отсутствии — сумма по всем actions.

---

## Деплой и Cron

- **Vercel:** деплой через Git или `vercel deploy`. В настройках задать все env-переменные, включая `CRON_SECRET` и `NEXT_PUBLIC_APP_URL`.
- **Cron:** в `vercel.json` настроен вызов `POST /api/meta/sync-all` каждый день в 06:00 UTC. Endpoint должен проверять `Authorization: Bearer ${CRON_SECRET}` (Vercel при cron подставляет заголовок автоматически, если настроен секрет).

---

## Типы (основные)

- `MetaAdAccount`, `CampaignInsight` (опционально `reach`, `frequency`, `video_p25_watched`, …, `video_thruplay`), `AlertRule`, `AiReport`, `AlertFired`
- `ChatMessage`, `MetricKey`, `METRIC_LABELS`
- В `lib/meta-api.ts`: `MetaInsightRow` (с опциональными `ad_id`, `ad_name`, `adset_id`, `adset_name`), `MetaAdsetInsightRow`, `MetaBreakdownRow`; для объявлений: `MetaAdNode`, `MetaAdCreative`, `MetaAdInsightRow` (per-ad daily), `fetchMetaAds`, `fetchMetaAdInsights(accountId, dateFrom, dateTo)` — ad-level по аккаунту, `fetchMetaAdInsightsByAdId(adId, ...)` — по одному объявлению для списка ads, `fetchMetaAdPreview`. В `api/meta/sync`: `extractActionValue(actions)` для video-actions. В `api/meta/adsets/route`: тип `AdsetAggregateRow` для агрегата по адсету.

---

## Запуск

```bash
npm install
cp .env.example .env.local   # заполнить переменные
npm run dev                  # http://localhost:3000
```

Перед первым запуском выполнить миграции в Supabase (SQL Editor или `supabase db push`), при необходимости добавить аккаунты вручную или через «Sync Accounts» в интерфейсе после выдачи токена Meta.
