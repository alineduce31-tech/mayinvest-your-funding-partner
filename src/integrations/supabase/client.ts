// src/integrations/supabase/client.ts
// Pointe sur le projet "My Invest" (uhlohqngavpmdcvujytt)
import { createClient } from '@supabase/supabase-js'
import { sessionHeaderSuffix } from '@/lib/session-tokens'

const SUPABASE_URL = 'https://uhlohqngavpmdcvujytt.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_v4yuX--xUlZ_uKiui2RBTA_tkc6yP_U'

// Ajoute les jetons de session Mayinvest à chaque appel (x-client-info est autorisé par Supabase)
const fetchWithSession: typeof fetch = (input, init) => {
  const suffix = sessionHeaderSuffix()
  if (!suffix) return fetch(input, init)
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  const base = headers.get('x-client-info') || 'supabase-js-web'
  headers.set('x-client-info', `${base} ${suffix}`)
  return fetch(input, { ...init, headers })
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    fetch: fetchWithSession,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Écoute les signaux temps réel (aucune donnée personnelle : juste "il s'est passé quelque chose sur tel dossier")
export function onLiveEvent(
  channelName: string,
  handler: (e: { topic: string; ref: string | null; extra: string | null }) => void,
) {
  const chan = supabase
    .channel(channelName)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_events' }, (payload) => {
      const n = payload.new as any
      handler({ topic: n.topic, ref: n.ref ?? null, extra: n.extra ?? null })
    })
    .subscribe()
  return () => {
    supabase.removeChannel(chan)
  }
}
