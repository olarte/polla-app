import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const BRAND = {
  bg: '#0A0A12',
  accent: '#E94560',
  secondary: '#0F3460',
  gold: '#FFD700',
  success: '#27AE60',
  text100: '#FFFFFF',
  text70: 'rgba(255,255,255,0.7)',
  text40: 'rgba(255,255,255,0.4)',
}

type Template = 'invite' | 'exact_score' | 'leaderboard' | 'tier' | 'card_pull' | 'payout'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const template = (searchParams.get('template') || 'invite') as Template
  const data = Object.fromEntries(searchParams.entries())

  return new ImageResponse(renderTemplate(template, data), {
    width: 1200,
    height: 630,
  })
}

function renderTemplate(template: Template, data: Record<string, string>) {
  switch (template) {
    case 'invite':
      return renderInvite(data)
    case 'exact_score':
      return renderExactScore(data)
    case 'leaderboard':
      return renderLeaderboard(data)
    case 'tier':
      return renderTier(data)
    case 'card_pull':
      return renderCardPull(data)
    case 'payout':
      return renderPayout(data)
    default:
      return renderInvite(data)
  }
}

function renderInvite(data: Record<string, string>) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${BRAND.bg}, ${BRAND.secondary})`,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 80, marginBottom: 10, display: 'flex' }}>🐔⚽</div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: BRAND.text100,
          marginBottom: 16,
          display: 'flex',
        }}
      >
        {data.group_name || 'Join My Polla!'}
      </div>
      <div
        style={{
          fontSize: 24,
          color: BRAND.text70,
          marginBottom: 30,
          display: 'flex',
        }}
      >
        Predict the FIFA World Cup 2026
      </div>
      {data.entry_fee && data.entry_fee !== '0' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(255,255,255,0.05)',
            padding: '12px 24px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span style={{ fontSize: 20, color: BRAND.gold, display: 'flex' }}>
            💰 ${data.entry_fee} entry
          </span>
          <span style={{ fontSize: 20, color: BRAND.text40, display: 'flex' }}>•</span>
          <span style={{ fontSize: 20, color: BRAND.text70, display: 'flex' }}>
            {data.members || '?'} members
          </span>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          fontSize: 18,
          color: BRAND.text40,
          display: 'flex',
        }}
      >
        polla.football
      </div>
    </div>
  )
}

function renderExactScore(data: Record<string, string>) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${BRAND.bg}, #1A1A4E)`,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 28, color: BRAND.success, marginBottom: 8, display: 'flex' }}>
        🎯 EXACT SCORE!
      </div>
      <div
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: BRAND.text100,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <span style={{ display: 'flex' }}>{data.home_team || 'HOME'}</span>
        <span style={{ color: BRAND.gold, display: 'flex' }}>
          {data.home_score || '0'} - {data.away_score || '0'}
        </span>
        <span style={{ display: 'flex' }}>{data.away_team || 'AWAY'}</span>
      </div>
      <div style={{ fontSize: 22, color: BRAND.text70, marginBottom: 20, display: 'flex' }}>
        {data.user_name || 'Player'} predicted it perfectly
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: BRAND.gold,
          display: 'flex',
        }}
      >
        +5 pts
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          fontSize: 18,
          color: BRAND.text40,
          display: 'flex',
        }}
      >
        polla.football
      </div>
    </div>
  )
}

function renderLeaderboard(data: Record<string, string>) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${BRAND.bg}, ${BRAND.secondary})`,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 60, marginBottom: 10, display: 'flex' }}>🏆</div>
      <div style={{ fontSize: 28, color: BRAND.text70, marginBottom: 8, display: 'flex' }}>
        {data.group_name || 'La Gran Polla'}
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: BRAND.text100,
          marginBottom: 8,
          display: 'flex',
        }}
      >
        #{data.rank || '1'}
      </div>
      <div style={{ fontSize: 24, color: BRAND.text70, marginBottom: 20, display: 'flex' }}>
        {data.user_name || 'Player'} • {data.points || '0'} pts
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          fontSize: 18,
          color: BRAND.text40,
          display: 'flex',
        }}
      >
        polla.football
      </div>
    </div>
  )
}

function renderTier(data: Record<string, string>) {
  const tierColors: Record<string, string> = {
    mythic: BRAND.gold,
    diamond: '#B9F2FF',
    platinum: '#E5E4E2',
    gold: BRAND.gold,
    silver: '#C0C0C0',
    bronze: '#CD7F32',
  }
  const tierEmojis: Record<string, string> = {
    mythic: '🏆',
    diamond: '💎',
    platinum: '⭐',
    gold: '🥇',
    silver: '🥈',
    bronze: '🥉',
  }
  const tier = (data.tier || 'gold').toLowerCase()
  const color = tierColors[tier] || BRAND.gold

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${BRAND.bg}, #1A1A4E)`,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 80, marginBottom: 10, display: 'flex' }}>
        {tierEmojis[tier] || '🥇'}
      </div>
      <div style={{ fontSize: 28, color: BRAND.text70, marginBottom: 4, display: 'flex' }}>
        TIER PROMOTION
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          color,
          textTransform: 'uppercase',
          marginBottom: 12,
          display: 'flex',
        }}
      >
        {tier}
      </div>
      <div style={{ fontSize: 22, color: BRAND.text70, display: 'flex' }}>
        {data.user_name || 'Player'} • Top {data.percentile || '5'}%
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          fontSize: 18,
          color: BRAND.text40,
          display: 'flex',
        }}
      >
        polla.football
      </div>
    </div>
  )
}

function renderCardPull(data: Record<string, string>) {
  const rarityColors: Record<string, string> = {
    common: 'rgba(255,255,255,0.4)',
    rare: '#4FC3F7',
    epic: '#CE93D8',
    legendary: BRAND.gold,
  }
  const rarity = (data.rarity || 'common').toLowerCase()
  const color = rarityColors[rarity] || BRAND.text40

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${BRAND.bg}, #1A1A4E)`,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          width: 200,
          height: 280,
          borderRadius: 16,
          border: `3px solid ${color}`,
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          boxShadow: `0 0 30px ${color}40`,
        }}
      >
        <span style={{ fontSize: 80, display: 'flex' }}>{data.card_emoji || '🃏'}</span>
        <span style={{ fontSize: 16, color, marginTop: 12, display: 'flex' }}>
          {data.card_name || 'Mystery Card'}
        </span>
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color,
          textTransform: 'uppercase',
          display: 'flex',
        }}
      >
        {rarity}
      </div>
      <div style={{ fontSize: 18, color: BRAND.text70, marginTop: 8, display: 'flex' }}>
        Pulled by {data.user_name || 'Player'}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          fontSize: 18,
          color: BRAND.text40,
          display: 'flex',
        }}
      >
        polla.football
      </div>
    </div>
  )
}

function renderPayout(data: Record<string, string>) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${BRAND.bg}, #0F3460)`,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 80, marginBottom: 10, display: 'flex' }}>💰</div>
      <div style={{ fontSize: 28, color: BRAND.text70, marginBottom: 8, display: 'flex' }}>
        PAYOUT EARNED
      </div>
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: BRAND.gold,
          marginBottom: 12,
          display: 'flex',
        }}
      >
        ${data.amount || '0'}
      </div>
      <div style={{ fontSize: 24, color: BRAND.text70, marginBottom: 8, display: 'flex' }}>
        {data.user_name || 'Player'} • #{data.rank || '1'} in {data.group_name || 'Polla'}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          fontSize: 18,
          color: BRAND.text40,
          display: 'flex',
        }}
      >
        polla.football
      </div>
    </div>
  )
}
