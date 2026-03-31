'use client'

import { useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useAuth } from '../contexts/AuthContext'

/**
 * Syncs wagmi wallet address to Supabase user profile.
 * Runs inside both Web3Provider and AuthProvider.
 */
export default function WalletSync() {
  const { address, isConnected } = useAccount()
  const { profile, connectWallet } = useAuth()
  const synced = useRef(false)

  useEffect(() => {
    if (!isConnected || !address || !profile || synced.current) return
    // Only sync if not already saved
    if (profile.wallet_connected && profile.wallet_address === address) return

    synced.current = true
    connectWallet(address).catch(() => {
      synced.current = false
    })
  }, [isConnected, address, profile, connectWallet])

  return null
}
