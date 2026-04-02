'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/app', icon: '🏠', label: 'Home' },
  { href: '/app/pollas', icon: '⛱️', label: 'My Pools' },
  { href: '/app/daily', icon: '🌸', label: 'Daily' },
  { href: '/app/global', icon: '🌍', label: 'Global' },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  const handleTabClick = (href: string) => {
    const isCurrentTab =
      href === '/app' ? pathname === '/app' : pathname.startsWith(href)
    if (isCurrentTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 nav-glass safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {TABS.map((tab) => {
          const active =
            tab.href === '/app'
              ? pathname === '/app'
              : pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => handleTabClick(tab.href)}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1 rounded-xl transition-all duration-200 ${
                active ? 'scale-105' : 'opacity-50'
              }`}
            >
              <span className="text-[22px] leading-none">{tab.icon}</span>
              <span
                className={`text-[10px] uppercase tracking-[0.1em] font-semibold transition-colors duration-200 ${
                  active ? 'text-polla-accent' : 'text-text-40'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
