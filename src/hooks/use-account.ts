'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ACCOUNTS, MetaAdAccount } from '@/types'

interface AccountStore {
  accounts: MetaAdAccount[]
  setAccounts: (accounts: MetaAdAccount[]) => void
  selectedAccount: MetaAdAccount
  setSelectedAccount: (account: MetaAdAccount) => void
}

function getDefaultAccount(accounts: MetaAdAccount[]): MetaAdAccount {
  return accounts.length > 0 ? accounts[0] : ACCOUNTS[0]
}

export const useAccountStore = create<AccountStore>()(
  persist(
    (set) => ({
      accounts: [],
      setAccounts: (accounts) =>
        set((state) => {
          const next = accounts.length > 0 ? accounts : ACCOUNTS
          const currentId = state.selectedAccount?.account_id
          const stillExists = next.some((a) => a.account_id === currentId)
          const selectedAccount = stillExists
            ? state.selectedAccount
            : getDefaultAccount(next)
          return { accounts: next, selectedAccount }
        }),
      selectedAccount: getDefaultAccount(ACCOUNTS),
      setSelectedAccount: (account) => set({ selectedAccount: account }),
    }),
    { name: 'leadleap-account', partialize: (s) => ({ selectedAccount: s.selectedAccount }) }
  )
)
