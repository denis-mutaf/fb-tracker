import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

export const metadata: Metadata = {
  title: 'LeadLeap — Meta Ads Dashboard',
  description: 'AI-powered dashboard for tracking Meta advertising campaigns',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <TooltipProvider>
          <div className="flex min-h-screen" style={{ background: '#0a0a0f' }}>
            <Sidebar />
            <main className="flex-1 ml-16 lg:ml-60 min-h-screen">
              {children}
            </main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  )
}
