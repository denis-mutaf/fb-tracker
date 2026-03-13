'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  BarChart3,
  MessageSquare,
  Settings,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campaigns', label: 'Кампании', icon: BarChart3 },
  { href: '/chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/settings', label: 'Настройки', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-16 lg:w-60 z-40 flex flex-col"
      style={{ background: '#0d0d14', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
          <Zap size={16} className="text-white" />
        </div>
        <span className="hidden lg:block font-bold text-lg tracking-tight text-white">
          LeadLeap
        </span>
      </div>

      <nav className="flex-1 py-4 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 cursor-pointer',
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
                style={isActive ? {
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#3b82f6',
                } : {}}
              >
                <item.icon size={18} className="flex-shrink-0" />
                <span className="hidden lg:block text-sm font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-blue-500"
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className="px-2 py-4 border-t border-white/5">
        <div className="flex items-center gap-2 px-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="hidden lg:block text-xs text-slate-500">v1.0.0</span>
        </div>
      </div>
    </aside>
  )
}
