import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Service-role client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
