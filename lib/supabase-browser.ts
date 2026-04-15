import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from './database.types'

// Disable the cross-tab auth lock. The default Supabase browser
// client serializes auth operations via navigator.locks so two
// tabs don't refresh tokens at the same time, but on a mobile
// PWA the lock can deadlock after a suspend/resume cycle — the
// resumed process waits on a lock that no longer has a live
// holder, and every subsequent fetch hangs forever.
//
// Polla is a single-tab PWA, so we don't need the cross-tab
// coordination. A no-op lock just runs the callback inline.
const noOpLock = async <R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> => fn()

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lock: noOpLock as any,
      },
    }
  )
