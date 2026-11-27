import { supabase } from '@/integrations/supabase/client'
import { demanderDepot, informer } from '@/components/Dialogue'
import { banqueParDefaut, doitDemanderDepot, type LeadDepot } from '@/lib/depot'

let cacheBanques: string[] | null = null
async function listeBanques(): Promise<string[]> {
  if (cacheBanques) return cacheBanques
  const { data } = await supabase.rpc('mi_liste_banques')
  cacheBanques = Array.isArray(data) && data.length ? data : ['BGFI', 'Ecobank', 'MUCODEC', 'UBA']
  return cacheBanques
}

/**
 * Après un changement de statut : demande la banque de dépôt (et le montant financé au financement)
 * quand elle manque. Utilisé partout où un statut change (admin, messageries, espace commercial).
 * Renvoie les valeurs enregistrées, ou null si rien n'a été saisi.
 */
export async function completerDepot(leadId: string, statut: string, lead: LeadDepot | null | undefined, force = false) {
  if (!force && !doitDemanderDepot(statut, lead)) return null
  const banques = await listeBanques()
  const finance = statut === 'Financé'
  const r = await demanderDepot({
    titre: finance ? 'Banque et montant du financement' : 'Dans quelle banque le dossier est-il déposé ?',
    texte: 'Sert au rapport mensuel des banques (financements et taux d’acceptation).',
    banques,
    banque: banqueParDefaut(lead),
    avecMontant: finance,
    montant: finance ? Number(lead?.montant_finance ?? lead?.montant_demande) || null : null,
  })
  if (!r) return null
  const { error } = await supabase.rpc('mi_set_depot', { p_lead_id: leadId, p_banque: r.banque, p_montant: r.montant })
  if (error) { informer('Banque non enregistrée : ' + error.message); return null }
  if (!banques.includes(r.banque)) cacheBanques = null
  informer(`Banque de dépôt enregistrée : ${r.banque}`, 'ok')
  return { banque_depot: r.banque, montant_finance: r.montant ?? lead?.montant_finance ?? null }
}
