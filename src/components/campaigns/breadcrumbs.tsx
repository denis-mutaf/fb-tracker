'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface CampaignsBreadcrumbsProps {
  items: BreadcrumbItem[]
  searchParams?: Record<string, string>
}

function buildQuery(searchParams?: Record<string, string>): string {
  if (!searchParams || Object.keys(searchParams).length === 0) return ''
  const q = new URLSearchParams(searchParams).toString()
  return q ? `?${q}` : ''
}

export function CampaignsBreadcrumbs({ items, searchParams }: CampaignsBreadcrumbsProps) {
  const query = buildQuery(searchParams)

  return (
    <nav className="flex items-center gap-1.5 text-sm flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />}
          {item.href != null ? (
            <Link
              href={item.href + query}
              className="text-slate-400 hover:text-white transition-colors truncate max-w-[200px] md:max-w-[280px]"
              title={item.label}
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-white font-medium truncate max-w-[200px] md:max-w-[320px]" title={item.label}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
