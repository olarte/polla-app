'use client'

import { useState } from 'react'
import { useConnect, useAccount } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useAuth } from '../contexts/AuthContext'

interface ConnectWalletPromptProps {
  onClose: () => void
  onConnected?: () => void
}

export default function ConnectWalletPrompt({ onClose, onConnected }: ConnectWalletPromptProps) {
  const { connectWallet } = useAuth()
  const { connectAsync } = useConnect()
  const { address: wagmiAddress } = useAccount()
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const hasCeloProvider = typeof window !== 'undefined' && !!(window as any).ethereum

  const handleConnect = async () => {
    setConnecting(true)
    setError('')

    try {
      // Connect through wagmi so useAccount() picks it up everywhere
      const result = await connectAsync({ connector: injected() })
      const address = result.accounts[0]

      if (!address) {
        setError('No account found')
        return
      }

      // Also save to Supabase profile
      await connectWallet(address)
      onConnected?.()
    } catch {
      setError('Connection failed. Try again.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-polla-bg border border-card-border rounded-2xl p-6 space-y-5">
        <div className="text-center">
          <span className="text-5xl block mb-3">💳</span>
          <h2 className="text-lg font-bold">Connect Wallet</h2>
        </div>

        {hasCeloProvider ? (
          <>
            <p className="text-text-40 text-sm text-center">
              Connect your MiniPay wallet to join paid pollas and claim prizes.
            </p>

            {error && (
              <p className="text-polla-accent text-xs text-center">{error}</p>
            )}

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all
                bg-gradient-to-b from-polla-success to-green-700 text-white
                disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect MiniPay Wallet'}
            </button>
          </>
        ) : (
          <>
            <p className="text-text-40 text-sm text-center">
              Polla uses MiniPay for secure payments. Download Opera Mini to get started.
            </p>

            <a
              href="https://www.opera.com/mini"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 rounded-xl font-bold text-sm text-center transition-all
                bg-gradient-to-b from-polla-success to-green-700 text-white"
            >
              Get MiniPay
            </a>
          </>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 text-text-40 text-sm hover:text-text-70 transition-colors"
        >
          Keep playing free
        </button>
      </div>
    </div>
  )
}
