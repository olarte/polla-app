'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState('⚽')
  const [showEmojiInput, setShowEmojiInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmojiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const emojiMatch = value.match(
      /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu
    )
    if (emojiMatch) {
      setAvatarEmoji(emojiMatch[emojiMatch.length - 1])
    }
    setShowEmojiInput(false)
  }

  const handleSignup = async () => {
    if (!displayName.trim()) {
      setError('Enter your name')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create anonymous auth session
      const { data, error: authError } = await supabase.auth.signInAnonymously()

      if (authError || !data.session) {
        setError('Failed to create account. Try again.')
        return
      }

      // Create user profile
      const res = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          avatar_emoji: avatarEmoji,
          country_code: 'CO',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Something went wrong')
        return
      }

      router.push('/')
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-polla-bg flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="text-6xl mb-2">⚽</div>
      <h1 className="text-2xl font-extrabold text-white mb-1">SABI</h1>
      <p className="text-text-40 text-sm mb-8">Predict the World Cup 2026</p>

      <div className="w-full max-w-sm">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <label className="label mb-2">Choose your avatar</label>
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
        <label className="label mb-2 block">Your name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your name"
          maxLength={30}
          className="w-full glass-card px-4 py-3 text-sm bg-transparent text-white
            placeholder:text-text-25 outline-none focus:border-polla-accent
            transition-colors mb-4"
          autoFocus
        />

        {error && (
          <p className="text-polla-accent text-xs mb-3">{error}</p>
        )}

        <button
          onClick={handleSignup}
          disabled={loading || !displayName.trim()}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-all
            bg-btn-primary text-white disabled:opacity-40"
        >
          {loading ? 'Setting up...' : 'Start Predicting'}
        </button>
      </div>

      {/* Footer */}
      <p className="text-text-25 text-[10px] mt-8 text-center max-w-xs">
        By continuing you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  )
}
