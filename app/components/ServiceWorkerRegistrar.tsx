'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '../../lib/notifications'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Register SW on load for offline support
    // Push permission is requested later via subscribeToPush() after user engagement
    registerServiceWorker()
  }, [])

  return null
}
