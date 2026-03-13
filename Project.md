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
| AI | OpenAI API (GPT-4o) |
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
│   │   ├── campaigns/page.tsx       # Кампании + модал с деталями (6 вкладок)
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
│   │           ├── demographics/route.ts  # GET — демография
│   │           ├── placements/route.ts    # GET — плейсменты
│   │           ├── geo/route.ts           # GET — география
│   │           └── hourly/route.ts        # GET — по часам
│   ├── components/
│   │   ├── layout/        # Sidebar, Header
│   │   ├── campaigns/     # CampaignDetailModal (6 вкладок: обзор, адсеты, демография, плейсменты, гео, по часам)
│   │   ├── dashboard/     # MetricCard, Charts, DateRangePicker, AiInsightsBlock
│   │   └── ui/            # shadcn: button, card, table, tabs, popover, etc.
│   ├── lib/
│   │   ├── supabase.ts    # supabase + supabaseAdmin
│   │   ├── meta-api.ts    # fetch Meta Insights (campaign, adset, breakdowns)
│   │   └── utils.ts       # cn, formatCurrency, formatNumber, formatPercent
│   ├── hooks/
│   │   └── use-account.ts # Zustand: selectedAccount, accounts, setAccounts
│   └── types/
│       └── index.ts       # MetaAdAccount, CampaignInsight, AlertRule, etc.
├── supabase/
│   └── migrations/
│       ├── 20250307000000_create_meta_adset_insights.sql
│       └── 20250307100000_create_meta_breakdown_tables.sql
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
| `OPENAI_API_KEY` | Ключ OpenAI для GPT-4o |
| `CRON_SECRET` | Секрет для защиты `/api/meta/sync-all` при вызове cron |
| `NEXT_PUBLIC_APP_URL` | Полный URL приложения (для sync-all при деплое) |

---

## База данных (Supabase)

### Таблицы

- **meta_ad_accounts** — рекламные аккаунты Meta (`account_id`, `account_name`, `account_currency`, `is_active`).
- **meta_campaign_insights** — инсайты по кампаниям по дням (`account_id`, `campaign_id`, `campaign_name`, `date`, `spend`, `impressions`, `clicks`, `results`, `cost_per_result`, `cpm`, `cpc`, `ctr`). Unique: `(account_id, campaign_name, date)`.
- **meta_adset_insights** — инсайты по ad set по дням. Unique: `(account_id, adset_name, campaign_name, date)`.
- **meta_demographic_insights** — разбивка по возрасту и полу. Unique: `(account_id, campaign_name, date, age, gender)`.
- **meta_placement_insights** — по платформе и позиции. Unique: `(account_id, campaign_name, date, publisher_platform, platform_position)`.
- **meta_geo_insights** — по стране и региону. Unique: `(account_id, campaign_name, date, country, region)`.
- **meta_hourly_insights** — по часу суток (0–23). Unique: `(account_id, campaign_name, date, hour)`.
- **alert_rules** — пороговые правила для алертов (`account_id`, `metric`, `operator`, `threshold`, `label`, `is_active`).
- **ai_reports** — сохранённые AI-отчёты (`account_id`, `report_date`, `report_text`, `alerts` jsonb).

Миграции лежат в `supabase/migrations/`. Таблицы `meta_ad_accounts` и `meta_campaign_insights` создаются отдельно (см. раздел SQL в настройках приложения или README).

---

## API Routes

### Meta

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/meta/sync` | Синхронизация одного аккаунта: кампании, ad sets, демография, плейсменты, гео, по часам. Body: `{ accountId, dateFrom?, dateTo? }`. Возврат: `{ success, rows_synced }` или `{ success: false, error, rows_synced: 0 }` (status 200 при ошибке Meta). |
| POST | `/api/meta/sync-all` | Синк всех активных аккаунтов из `meta_ad_accounts`. Защита: `Authorization: Bearer CRON_SECRET` или Vercel cron. |
| POST | `/api/meta/sync-accounts` | Загрузка списка аккаунтов из Meta `me/adaccounts`, upsert в `meta_ad_accounts`. Возврат: `{ success, accounts_synced }`. |
| GET | `/api/meta/accounts` | Список активных аккаунтов из БД. |
| GET | `/api/meta/insights` | Инсайты. Query: `accountId`, `dateFrom`, `dateTo`, `groupBy` (day \| campaign). |
| GET | `/api/meta/adsets` | Ad sets по кампании. Query: `accountId`, `campaignName`, `dateFrom`, `dateTo`. |
| GET | `/api/meta/demographics` | Демография. Query: `accountId`, `dateFrom`, `dateTo`, `campaignName` (опционально, через запятую). |
| GET | `/api/meta/placements` | Плейсменты. Те же параметры. |
| GET | `/api/meta/geo` | География. Те же параметры. |
| GET | `/api/meta/hourly` | По часам. Те же параметры. |

### AI

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/ai/analyze` | Генерация AI-отчёта. Body: `{ accountId, dateFrom, dateTo, question? }`. В промпт подставляются кампании, алерты, демография, плейсменты, гео. Результат сохраняется в `ai_reports`. |
| POST | `/api/ai/chat` | Стриминг-чат. Body: `{ accountId, messages }`. Ответ — SSE stream. |

### Alerts

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/alerts` | Список правил. Query: `accountId?`. |
| POST | `/api/alerts` | Действия: `action: 'create' \| 'toggle' \| 'delete'` + соответствующие поля. |

---

## Страницы и функциональность

- **Dashboard (`/`)** — сводные метрики (расход, показы, клики, результаты, CTR, CPC, цена за результат), сравнение с предыдущим периодом, графики (расход по дням, CPC/CPR, результаты по кампаниям, показы/клики), блок AI-аналитики (запрос отчёта, сработавшие алерты).
- **Кампании (`/campaigns`)** — таблица кампаний с сортировкой и подсветкой по алертам. Клик по строке открывает полноэкранный модал с детальной аналитикой кампании (6 вкладок: Обзор, Адсеты, Демография, Плейсменты, География, По часам). Данные вкладок загружаются лениво при первом переходе.
- **AI Chat (`/chat`)** — чат с GPT-4o по данным аккаунта (последние 30 дней + алерты), стриминг ответов, примеры вопросов.
- **Настройки (`/settings`)** — индикатор срока действия Meta Access Token, CRUD правил алертов (метрика, оператор, порог, описание), пример SQL для создания таблиц.

---

## Логика синхронизации (Meta API)

- **Кампании:** `GET /{accountId}/insights` с `level=campaign`, `time_increment=1`, пагинация по `paging.next`, задержка 300 ms между запросами, при 429 — exponential backoff.
- **Ad sets:** то же с `level=adset`, поля `adset_id`, `adset_name`.
- **Breakdowns:** те же поля + параметр `breakdowns`: `age,gender` \| `publisher_platform,platform_position` \| `country,region` \| `hourly_stats_aggregated_by_advertiser_time_zone`. Четыре типа breakdown-синка выполняются параллельно через `Promise.allSettled`; ошибка одного не отменяет остальные.
- **accountId** в запросах к Meta нормализуется: при отсутствии префикса `act_` он добавляется.
- **Результаты (results):** из поля `actions` выбираются типы lead, complete_registration, purchase и др.; при отсутствии — сумма по всем actions.

---

## Деплой и Cron

- **Vercel:** деплой через Git или `vercel deploy`. В настройках задать все env-переменные, включая `CRON_SECRET` и `NEXT_PUBLIC_APP_URL`.
- **Cron:** в `vercel.json` настроен вызов `POST /api/meta/sync-all` каждый день в 06:00 UTC. Endpoint должен проверять `Authorization: Bearer ${CRON_SECRET}` (Vercel при cron подставляет заголовок автоматически, если настроен секрет).

---

## Типы (основные)

- `MetaAdAccount`, `CampaignInsight`, `AlertRule`, `AiReport`, `AlertFired`
- `ChatMessage`, `MetricKey`, `METRIC_LABELS`
- В `lib/meta-api.ts`: `MetaInsightRow`, `MetaAdsetInsightRow`, `MetaBreakdownRow` для ответов Meta API.

---

## Запуск

```bash
npm install
cp .env.example .env.local   # заполнить переменные
npm run dev                  # http://localhost:3000
```

Перед первым запуском выполнить миграции в Supabase (SQL Editor или `supabase db push`), при необходимости добавить аккаунты вручную или через «Sync Accounts» в интерфейсе после выдачи токена Meta.
