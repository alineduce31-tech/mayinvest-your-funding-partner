import { supabase } from '@/integrations/supabase/client'

export type ResetKind = 'client' | 'commercial'

// Demande l'envoi d'un lien de réinitialisation par email (clients et commerciaux)
export async function requestPasswordReset(email: string, kind: ResetKind): Promise<{ ok: boolean; message: string }> {
  const clean = email.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(clean)) return { ok: false, message: 'Adresse email invalide.' }
  try {
    const { error } = await supabase.functions.invoke('request-password-reset', { body: { email: clean, kind } })
    if (error) throw error
    return {
      ok: true,
      message: `Si un compte existe avec ${clean}, un lien vient d'être envoyé. Il est valable 1 heure. Pensez à regarder dans les spams.`,
    }
  } catch {
    return { ok: false, message: "L'envoi d'email est momentanément indisponible. Réessayez plus tard ou écrivez à votre conseiller." }
  }
}

