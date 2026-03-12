'use client'

interface WhatsAppBtnProps {
  text?: string
  message?: string
  className?: string
}

export default function WhatsAppBtn({
  text = 'Share on WhatsApp',
  message = '',
  className = '',
}: WhatsAppBtnProps) {
  const handleShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
        bg-polla-whatsapp/[0.15] border border-polla-whatsapp/[0.33] text-polla-whatsapp
        active:scale-95 transition-transform duration-100 ${className}`}
    >
      <span className="text-base">💬</span>
      {text}
    </button>
  )
}
