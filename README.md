# LeadLeap — Meta Ads Dashboard

AI-powered дашборд для трекинга рекламных кампаний Meta (Facebook/Instagram).

## Стек

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** + **shadcn/ui**
- **Recharts** — интерактивные графики
- **Supabase** — PostgreSQL база данных
- **Anthropic Claude (claude-sonnet-4-6)** — AI анализ и чат
- **Framer Motion** — анимации
- **Zustand** — управление состоянием

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Переменные окружения

Скопируй `.env.local` и заполни значения:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

META_ACCESS_TOKEN=EAAxxxxx
META_APP_ID=1640261420505969
META_APP_SECRET=xxx

ANTHROPIC_API_KEY=sk-ant-xxx

CRON_SECRET=your-secret
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 3. База данных (Supabase)

Выполни SQL из раздела **Settings → SQL** в приложении, или перейди в Supabase SQL Editor и вставь схему.

### 4. Запуск

```bash
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000)

## Структура проекта

```
src/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── campaigns/page.tsx    # Кампании
│   ├── chat/page.tsx         # AI Chat
│   ├── settings/page.tsx     # Настройки
│   └── api/
│       ├── meta/sync/        # POST — синхронизация с Meta API
│       ├── meta/sync-all/    # POST — синхронизация всех аккаунтов
│       ├── meta/insights/    # GET — данные из Supabase
│       ├── ai/analyze/       # POST — AI анализ
│       ├── ai/chat/          # POST — стриминг чат
│       └── alerts/           # GET/POST — правила алертов
├── components/
│   ├── layout/               # Sidebar, Header
│   └── dashboard/            # Charts, MetricCard, DateRangePicker, AiInsightsBlock
├── lib/
│   ├── supabase.ts           # Supabase клиенты
│   ├── meta-api.ts           # Meta Graph API
│   └── utils.ts              # Утилиты форматирования
├── hooks/
│   └── use-account.ts        # Zustand стор для выбранного аккаунта
└── types/
    └── index.ts              # TypeScript типы
```

## Деплой на Vercel

```bash
vercel deploy
```

Cron автоматически синхронизирует данные каждый день в 06:00 UTC.

## Аккаунты

- **Anver Textil** — `act_1478794733204244`
- **Denis Cosarnii** — `act_1160997135477649`
