const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://sabi.gg'

export type ShareTemplate = 'invite' | 'exact_score' | 'leaderboard' | 'tier' | 'payout'

export interface ShareOptions {
  template: ShareTemplate
  title: string
  text: string
  url?: string
  params?: Record<string, string>
}

function buildImageUrl(template: ShareTemplate, params?: Record<string, string>): string {
  const searchParams = new URLSearchParams({ template, ...params })
  return `${BASE_URL}/api/share/generate?${searchParams.toString()}`
}

function buildWhatsAppUrl(text: string, url?: string): string {
  const message = url ? `${text}\n${url}` : text
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

async function trackShare(shareType: string): Promise<{ xp_awarded: number }> {
  try {
    const res = await fetch('/api/share/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ share_type: shareType }),
    })
    return res.json()
  } catch {
    return { xp_awarded: 0 }
  }
}

export async function share(options: ShareOptions): Promise<{ xp_awarded: number }> {
  const { template, title, text, url, params } = options
  const shareUrl = url || BASE_URL
  const imageUrl = buildImageUrl(template, params)

  // Try Web Share API first (mobile native share sheet)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      // Try sharing with image
      const imageRes = await fetch(imageUrl)
      const imageBlob = await imageRes.blob()
      const imageFile = new File([imageBlob], 'sabi-share.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [imageFile] })) {
        await navigator.share({ title, text, url: shareUrl, files: [imageFile] })
      } else {
        await navigator.share({ title, text, url: shareUrl })
      }

      return trackShare(template)
    } catch (err) {
      // User cancelled or API failed — fall through to WhatsApp
      if (err instanceof Error && err.name === 'AbortError') {
        return { xp_awarded: 0 }
      }
    }
  }

  // Fallback: WhatsApp deep link
  window.open(buildWhatsAppUrl(text, shareUrl), '_blank')
  return trackShare(template)
}

// Pre-built share configs
export function shareInvite(groupName: string, inviteCode: string, entryFee?: number, members?: number) {
  return share({
    template: 'invite',
    title: `Join ${groupName} on Sabi`,
    text: `Join my World Cup prediction pool "${groupName}" on Sabi! ⚽🏆`,
    url: `${BASE_URL}/join/${inviteCode}`,
    params: {
      group_name: groupName,
      ...(entryFee ? { entry_fee: String(entryFee) } : {}),
      ...(members ? { members: String(members) } : {}),
    },
  })
}

export function shareExactScore(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  userName: string
) {
  return share({
    template: 'exact_score',
    title: 'Exact Score Prediction!',
    text: `🎯 I predicted ${homeTeam} ${homeScore}-${awayScore} ${awayTeam} exactly on Sabi! Can you beat that?`,
    params: {
      home_team: homeTeam,
      away_team: awayTeam,
      home_score: String(homeScore),
      away_score: String(awayScore),
      user_name: userName,
    },
  })
}

export function shareLeaderboard(groupName: string, rank: number, points: number, userName: string) {
  return share({
    template: 'leaderboard',
    title: `#${rank} in ${groupName}`,
    text: `I'm ranked #${rank} with ${points} pts in "${groupName}" on Sabi! 🏆`,
    params: {
      group_name: groupName,
      rank: String(rank),
      points: String(points),
      user_name: userName,
    },
  })
}

export function shareTierPromotion(tier: string, percentile: number, userName: string) {
  return share({
    template: 'tier',
    title: `${tier} Tier on Sabi`,
    text: `I reached ${tier} tier (top ${percentile}%) on Sabi! 🏆`,
    params: { tier, percentile: String(percentile), user_name: userName },
  })
}

export function sharePayout(
  amount: number,
  rank: number,
  groupName: string,
  userName: string
) {
  return share({
    template: 'payout',
    title: `$${amount} Payout!`,
    text: `I won $${amount} finishing #${rank} in "${groupName}" on Sabi! 💰`,
    params: {
      amount: String(amount),
      rank: String(rank),
      group_name: groupName,
      user_name: userName,
    },
  })
}
