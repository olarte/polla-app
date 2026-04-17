/**
 * Untyped admin client for parlay settlement code.
 *
 * lib/database.types.ts was generated before the parlay_* and cron
 * bookkeeping tables were added (migrations 016 + 017). Rather than
 * hand-patching the generated types, parlay modules import this
 * loose-typed client. Types will tighten again when the .types file
 * is regenerated from the live schema.
 */

import { createClient } from '@supabase/supabase-js'

export const supabaseParlay = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
