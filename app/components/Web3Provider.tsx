'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi-config'
import { type ReactNode, useState, useEffect } from 'react'
import { reconnect } from '@wagmi/core'

function EagerConnect() {
  useEffect(() => {
    // Auto-reconnect if injected provider (MiniPay) is available
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      reconnect(wagmiConfig)
    }
  }, [])
  return null
}

export default function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <EagerConnect />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
