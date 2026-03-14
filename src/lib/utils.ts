import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value)
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`
}

export function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function isMetricBetter(metric: string, change: number): boolean {
  const lowerIsBetter = ['cost_per_result', 'cpm', 'cpc', 'spend']
  return lowerIsBetter.includes(metric) ? change < 0 : change > 0
}

/**
 * Human-readable label for Meta placement (publisher_platform + platform_position).
 */
export function formatPlacement(platform: string, position: string): string {
  const map: Record<string, string> = {
    'facebook/feed': 'Facebook Feed',
    'facebook/right_hand_column': 'Facebook Sidebar',
    'facebook/marketplace': 'Facebook Marketplace',
    'facebook/video_feeds': 'Facebook Video Feed',
    'facebook/story': 'Facebook Stories',
    'facebook/search': 'Facebook Search',
    'instagram/feed': 'Instagram Feed',
    'instagram/story': 'Instagram Stories',
    'instagram/explore': 'Instagram Explore',
    'instagram/explore_grid_home': 'Instagram Explore Grid',
    'instagram/instagram_explore_grid_home': 'Instagram Explore Grid',
    'instagram/reels': 'Instagram Reels',
    'instagram/instagram_reels': 'Instagram Reels',
    'instagram/profile_feed': 'Instagram Profile',
    'audience_network/classic': 'Audience Network',
    'audience_network/rewarded_video': 'Audience Network Video',
    'messenger/messenger_home': 'Messenger',
    'messenger/story': 'Messenger Stories',
  }
  const key = `${platform}/${position}`.toLowerCase()
  return map[key] || `${platform} / ${position.replace(/_/g, ' ')}`
}
