'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { COUNTRIES } from '@/lib/countries'
import { isMiniPayBrowser, getMiniPayAddress } from '@/lib/minipay'

type Step = 'phone' | 'otp'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [step, setStep] = useState<Step>('phone')
  const [countryIdx, setCountryIdx] = useState(0) // Default Colombia
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp')
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [miniPayDetected, setMiniPayDetected] = useState(false)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const supabase = createClient()

  // MiniPay auto-detection
  useEffect(() => {
    if (isMiniPayBrowser()) {
      setMiniPayDetected(true)
    }
  }, [])

  const handleMiniPayLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const address = await getMiniPayAddress()
      if (!address) {
        setError('Could not connect to MiniPay wallet')
        return
      }

      // Sign in with a deterministic email based on the address
      const email = `${address.toLowerCase()}@minipay.polla.football`
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })

      if (signInError) {
        setError('MiniPay authentication failed')
        return
      }

      // The session will be handled by AuthContext
      router.push('/onboarding')
    } catch {
      setError('MiniPay connection failed')
    } finally {
      setLoading(false)
    }
  }

  const fullPhone = `${COUNTRIES[countryIdx].dial}${phone}`

  const handleSendOtp = async () => {
    if (!phone || phone.length < 7) {
      setError('Enter a valid phone number')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send code')
        return
      }

      setChannel(data.channel)
      setStep('otp')
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newOtp.every((d) => d)) {
      handleVerifyOtp(newOtp.join(''))
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleVerifyOtp = async (code?: string) => {
    const otpCode = code || otp.join('')
    if (otpCode.length !== 6) {
      setError('Enter the 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, code: otpCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Verification failed')
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
        return
      }

      // Sign in on the client side so the browser Supabase client
      // picks up the session (server-side cookies alone aren't enough)
      const cleaned = fullPhone.replace(/[^\d+]/g, '')
      const phoneEmail = `${cleaned.replace('+', '')}@phone.polla.football`
      const phonePassword = `polla_phone_${cleaned}`

      const { error: clientSignInError } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: phonePassword,
      })

      if (clientSignInError) {
        console.error('Client sign-in error:', clientSignInError)
        setError('Authentication failed. Try again.')
        return
      }

      if (data.needsOnboarding) {
        router.push('/onboarding')
      } else {
        router.push(redirect)
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?redirect=${redirect}`,
      },
    })
  }


  return (
    <div className="min-h-screen bg-polla-bg flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="text-6xl mb-2">🐔</div>
      <h1 className="text-2xl font-extrabold text-white mb-1">POLLA</h1>
      <p className="text-text-40 text-sm mb-8">Predict the World Cup 2026</p>

      <div className="w-full max-w-sm">
        {step === 'phone' ? (
          <>
            {/* MiniPay button (if detected) */}
            {miniPayDetected && (
              <button
                onClick={handleMiniPayLogin}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm mb-4 transition-all
                  bg-gradient-to-b from-polla-success to-green-700 text-white
                  disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Continue with MiniPay'}
              </button>
            )}

            {/* Phone input */}
            <label className="label mb-2 block">Phone number</label>
            <div className="flex gap-2 mb-4">
              {/* Country selector */}
              <button
                onClick={() => setShowCountryPicker(!showCountryPicker)}
                className="glass-card px-3 py-3 flex items-center gap-1.5 text-sm shrink-0"
              >
                <span>{COUNTRIES[countryIdx].flag}</span>
                <span className="text-text-70">{COUNTRIES[countryIdx].dial}</span>
                <span className="text-text-40 text-xs">▾</span>
              </button>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="300 123 4567"
                className="flex-1 glass-card px-4 py-3 text-sm bg-transparent text-white
                  placeholder:text-text-25 outline-none focus:border-polla-accent
                  transition-colors"
                autoFocus
              />
            </div>

            {/* Country picker dropdown */}
            {showCountryPicker && (
              <div className="glass-card mb-4 max-h-48 overflow-y-auto">
                {COUNTRIES.map((c, i) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCountryIdx(i)
                      setShowCountryPicker(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                      hover:bg-white/5 transition-colors text-left"
                  >
                    <span>{c.flag}</span>
                    <span className="text-white flex-1">{c.name}</span>
                    <span className="text-text-40">{c.dial}</span>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="text-polla-accent text-xs mb-3">{error}</p>
            )}

            <button
              onClick={handleSendOtp}
              disabled={loading || phone.length < 7}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all
                bg-btn-primary text-white disabled:opacity-40"
            >
              {loading ? 'Sending...' : 'Send WhatsApp Code'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-card-border" />
              <span className="text-text-25 text-xs uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-card-border" />
            </div>

            {/* OAuth */}
            <button
              onClick={handleGoogleLogin}
              className="w-full glass-card py-3 text-sm text-text-70
                hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </>
        ) : (
          <>
            {/* OTP verification */}
            <p className="text-text-70 text-sm text-center mb-1">
              Code sent via {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to
            </p>
            <p className="text-white text-center font-bold mb-6">{fullPhone}</p>

            <div className="flex justify-center gap-2.5 mb-4">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el
                  }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 glass-card text-center text-xl font-extrabold
                    text-white bg-transparent outline-none focus:border-polla-accent
                    transition-colors"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && (
              <p className="text-polla-accent text-xs text-center mb-3">{error}</p>
            )}

            <button
              onClick={() => handleVerifyOtp()}
              disabled={loading || otp.some((d) => !d)}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all
                bg-btn-primary text-white disabled:opacity-40"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            <button
              onClick={() => {
                setStep('phone')
                setOtp(['', '', '', '', '', ''])
                setError('')
              }}
              className="w-full py-3 text-text-40 text-sm mt-3 hover:text-text-70 transition-colors"
            >
              Change number
            </button>

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full py-2 text-polla-accent text-sm hover:text-white transition-colors"
            >
              Resend code
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <p className="text-text-25 text-[10px] mt-8 text-center max-w-xs">
        By continuing you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  )
}
