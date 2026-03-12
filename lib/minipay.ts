// MiniPay (Celo) detection utilities

declare global {
  interface Window {
    ethereum?: {
      isMiniPay?: boolean
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

export function isMiniPayBrowser(): boolean {
  if (typeof window === 'undefined') return false
  return !!window.ethereum?.isMiniPay
}

export async function getMiniPayAddress(): Promise<string | null> {
  if (!isMiniPayBrowser()) return null

  try {
    const accounts = (await window.ethereum!.request({
      method: 'eth_requestAccounts',
    })) as string[]

    return accounts[0] || null
  } catch {
    return null
  }
}
