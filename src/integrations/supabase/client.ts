// src/integrations/supabase/client.ts
// Pointe sur le projet "My Invest" (uhlohqngavpmdcvujytt)
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uhlohqngavpmdcvujytt.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_v4yuX--xUlZ_uKiui2RBTA_tkc6yP_U'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
