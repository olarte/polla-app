'use client'

import { WagmiProvider, useConnect, useConnectors, useAccount } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi-config'
import { type ReactNode, useState, useEffect } from 'react'

/**
 * MiniPay auto-connect: per MiniPay docs, never show a connect button.
 * Automatically connect to the injected provider on page load.
 */
function MiniPayAutoConnect() {
  const connectors = useConnectors()
  const { connect } = useConnect()
  const { isConnected } = useAccount()
  const [hasAttempted, setHasAttempted] = useState(false)

  useEffect(() => {
    if (hasAttempted || isConnected || connectors.length === 0) return
    if (typeof window === 'undefined' || !(window as any).ethereum) return

    const attemptConnect = async () => {
      try {
        connect({ connector: connectors[0] })
      } catch (err) {
        console.error('MiniPay auto-connect failed:', err)
      }
      setHasAttempted(true)
    }

    attemptConnect()
  }, [connectors, connect, isConnected, hasAttempted])

  return null
}

export default function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MiniPayAutoConnect />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
