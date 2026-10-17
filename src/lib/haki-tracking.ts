// src/lib/haki-tracking.ts
// Utilitaire de tracking des interactions Haki
// À importer dans chaque page qui a Haki : import { trackHaki, getHakiSessionId } from '@/lib/haki-tracking'

import { supabase } from '@/integrations/supabase/client'

const SESSION_KEY = 'mayinvest_haki_session_id'
const LEAD_KEY = 'mayinvest_haki_lead_id'

/** Récupère ou crée un identifiant anonyme stable pour cette session visiteur. */
export function getHakiSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = 'anon_' + crypto.randomUUID()
      localStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return 'anon_fallback_' + Date.now()
  }
}

/** À appeler une fois quand on connaît l'identité du lead (ex : après login). */
export function linkHakiLead(leadId: string) {
  try { localStorage.setItem(LEAD_KEY, leadId) } catch {}
}

export function getHakiLeadId(): string | null {
  try { return localStorage.getItem(LEAD_KEY) } catch { return null }
}

/**
 * Envoi d'un événement Haki au backend. Non bloquant, silencieux en cas d'erreur.
 * Noms d'événements compatibles avec le dashboard admin HakiAnalyticsView :
 *  - 'page_view'         : au mount de chaque page
 *  - 'haki_open'         : panneau Haki ouvert ({ trigger: 'auto'|'manual' })
 *  - 'haki_close'        : panneau Haki fermé
 *  - 'haki_declined'     : "Non merci"
 *  - 'auto_mode_toggle'  : { enabled: true/false }
 *  - 'cta_click'         : { label, target } — bouton principal menant à une action
 *  - 'option_click'      : { label, step }   — choix dans Haki
 *  - 'field_focus'       : { field }
 *  - 'field_blur'        : { field }
 *  - 'form_error'        : { message, field }
 *  - 'form_submit'       : { fields_count }
 *  - 'demo_start' / 'demo_finish' : { channel: 'phone'|'email' }
 *  - 'login_success' / 'login_fail' : { method }
 */
export function trackHaki(
  page: string,
  event_type: string,
  event_data: Record<string, any> = {}
) {
  const session = getHakiSessionId()
  const lead = getHakiLeadId()
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : null
  // Appel asynchrone non bloquant
  supabase.rpc('track_haki_event', {
    p_session_id: session,
    p_page: page,
    p_event_type: event_type,
    p_event_data: event_data,
    p_lead_id: lead || null,
    p_user_agent: ua,
  }).then(() => {}).catch(() => {})
}
