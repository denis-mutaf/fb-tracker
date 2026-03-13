'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, ChevronDown, CheckCircle, AlertCircle, Users } from 'lucide-react'
import { useAccountStore } from '@/hooks/use-account'
import { ACCOUNTS } from '@/types'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { accounts, setAccounts, selectedAccount, setSelectedAccount } = useAccountStore()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isSyncingAccounts, setIsSyncingAccounts] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const list = accounts.length > 0 ? accounts : ACCOUNTS

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/accounts')
      const data = await res.json()
      if (data.data) setAccounts(data.data)
    } catch {
      setAccounts([])
    }
  }, [setAccounts])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  async function handleSync() {
    if (isSyncing) return
    setIsSyncing(true)
    setSyncStatus('idle')

    try {
      const res = await fetch('/api/meta/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccount.account_id }),
      })
      const data = await res.json()

      if (data.success) {
        setSyncStatus('success')
        setTimeout(() => setSyncStatus('idle'), 3000)
      } else {
        setSyncStatus('error')
        setTimeout(() => setSyncStatus('idle'), 3000)
      }
    } catch {
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 3000)
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleSyncAccounts() {
    if (isSyncingAccounts) return
    setIsSyncingAccounts(true)
    try {
      const res = await fetch('/api/meta/sync-accounts', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        await fetchAccounts()
        setToast({
          type: 'success',
          message: `Синхронизировано аккаунтов: ${data.accounts_synced}`,
        })
      } else {
        setToast({ type: 'error', message: data.error ?? 'Ошибка синхронизации аккаунтов' })
      }
    } catch {
      setToast({ type: 'error', message: 'Ошибка синхронизации аккаунтов' })
    } finally {
      setIsSyncingAccounts(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b"
      style={{
        background: 'rgba(10, 10, 15, 0.8)',
        borderColor: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
      }}>
      {title && (
        <h1 className="text-lg font-semibold text-white hidden md:block">{title}</h1>
      )}
      <div className={cn('flex items-center gap-3 ml-auto')}>
        <AnimatePresence>
          {syncStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={cn(
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full',
                syncStatus === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'
              )}>
              {syncStatus === 'success'
                ? <><CheckCircle size={12} /> Синхронизировано</>
                : <><AlertCircle size={12} /> Ошибка синхронизации</>
              }
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f1f5f9',
            }}>
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="max-w-[140px] truncate">{selectedAccount.account_name}</span>
            <ChevronDown size={14} className={cn('transition-transform', isDropdownOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50"
                style={{
                  background: '#1a1a26',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                }}>
                <div className="p-1">
                  {list.map((account) => (
                    <button
                      key={account.account_id}
                      onClick={() => {
                        setSelectedAccount(account)
                        setIsDropdownOpen(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors text-left"
                      style={{
                        color: selectedAccount.account_id === account.account_id ? '#3b82f6' : '#94a3b8',
                        background: selectedAccount.account_id === account.account_id
                          ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      }}>
                      <div className={cn('w-2 h-2 rounded-full',
                        selectedAccount.account_id === account.account_id ? 'bg-blue-500' : 'bg-slate-600')} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white truncate">{account.account_name}</div>
                        <div className="text-xs text-slate-500 truncate">{account.account_id}</div>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-white/5 mt-1 pt-1">
                    <button
                      onClick={handleSyncAccounts}
                      disabled={isSyncingAccounts}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                      style={{
                        color: '#3b82f6',
                        background: 'rgba(59, 130, 246, 0.08)',
                      }}
                    >
                      <Users size={14} className={cn(isSyncingAccounts && 'spin-slow')} />
                      {isSyncingAccounts ? 'Синхронизация...' : 'Sync Accounts'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: isSyncing ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#3b82f6',
          }}>
          <RefreshCw size={14} className={cn(isSyncing && 'spin-slow')} />
          <span className="hidden sm:block">{isSyncing ? 'Синхронизация...' : 'Обновить'}</span>
        </button>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg"
            style={{
              background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              color: toast.type === 'success' ? '#10b981' : '#ef4444',
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
