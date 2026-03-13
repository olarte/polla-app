'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'
import { COUNTRIES } from '@/lib/countries'
import { isMiniPayBrowser, getMiniPayAddress } from '@/lib/minipay'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, setMiniPayAddress, profile } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState('⚽')
  const [countryCode, setCountryCode] = useState('CO')
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [showEmojiInput, setShowEmojiInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if already onboarded
  useEffect(() => {
    if (profile?.onboarding_completed) {
      router.push('/')
    }
  }, [profile, router])

  // MiniPay auto-detect on mount
  useEffect(() => {
    if (isMiniPayBrowser()) {
      getMiniPayAddress().then((addr) => {
        if (addr) {
          setMiniPayAddress(addr)
        }
      })
    }
  }, [setMiniPayAddress])

  const handleEmojiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Extract the last emoji character(s)
    const emojiMatch = value.match(
      /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu
    )
    if (emojiMatch) {
      setAvatarEmoji(emojiMatch[emojiMatch.length - 1])
    }
    setShowEmojiInput(false)
  }

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0]

  const handleComplete = async () => {
    if (!displayName.trim()) {
      setError('Enter your name')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          avatar_emoji: avatarEmoji,
          country_code: countryCode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.')
        return
      }

      // Trigger wallet creation in background — don't block navigation
      fetch('/api/auth/create-wallet', { method: 'POST' }).catch(() => {})

      router.push('/')
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-polla-bg flex items-center justify-center">
        <div className="text-text-40 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-polla-bg flex flex-col items-center justify-center px-6">
      <h1 className="text-xl font-extrabold text-white mb-1">Welcome to Polla</h1>
      <p className="text-text-40 text-sm mb-8">Set up your profile</p>

      <div className="w-full max-w-sm">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <label className="label mb-2">Your avatar</label>
          <div className="relative">
            <button
              onClick={() => setShowEmojiInput(true)}
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl
                bg-gradient-to-br from-polla-accent to-polla-accent-dark
                border-2 border-polla-accent/50"
            >
              {avatarEmoji}
            </button>
            <span className="absolute -bottom-1 -right-1 text-xs bg-polla-bg rounded-full
              w-6 h-6 flex items-center justify-center border border-card-border">
              ✏️
            </span>
          </div>
          {showEmojiInput && (
            <input
              type="text"
              autoFocus
              className="mt-2 w-16 h-10 text-center text-2xl bg-transparent border-b
                border-polla-accent outline-none"
              onChange={handleEmojiChange}
              onBlur={() => setShowEmojiInput(false)}
              placeholder="😀"
            />
          )}
        </div>

        {/* Display name */}
        <label className="label mb-2 block">Display name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          maxLength={30}
          className="w-full glass-card px-4 py-3 text-sm bg-transparent text-white
            placeholder:text-text-25 outline-none focus:border-polla-accent
            transition-colors mb-4"
          autoFocus
        />

        {/* Country */}
        <label className="label mb-2 block">Country</label>
        <button
          onClick={() => setShowCountryPicker(!showCountryPicker)}
          className="w-full glass-card px-4 py-3 flex items-center gap-3 text-sm mb-4"
        >
          <span className="text-lg">{selectedCountry.flag}</span>
          <span className="text-white flex-1 text-left">{selectedCountry.name}</span>
          <span className="text-text-40 text-xs">▾</span>
        </button>

        {showCountryPicker && (
          <div className="glass-card mb-4 max-h-48 overflow-y-auto">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  setCountryCode(c.code)
                  setShowCountryPicker(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                  hover:bg-white/5 transition-colors text-left"
              >
                <span>{c.flag}</span>
                <span className="text-white flex-1">{c.name}</span>
                {c.code === countryCode && (
                  <span className="text-polla-accent">✓</span>
                )}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="text-polla-accent text-xs mb-3">{error}</p>
        )}

        <button
          onClick={handleComplete}
          disabled={loading || !displayName.trim()}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-all
            bg-btn-primary text-white disabled:opacity-40"
        >
          {loading ? 'Setting up...' : 'Start Predicting'}
        </button>
      </div>
    </div>
  )
}
