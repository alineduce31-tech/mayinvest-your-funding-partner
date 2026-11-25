// Edge Function "request-password-reset" (projet Supabase My Invest)
// Copie de référence : la version en ligne est déployée directement sur Supabase.
// - Le navigateur envoie seulement { email, kind } ("client" ou "commercial")
// - Le lien est créé en base (mi_create_password_reset, réservée au serveur) et envoyé par email via Resend
// - La réponse est toujours la même, que le compte existe ou non (impossible de deviner les emails inscrits)
import { createClient } from 'npm:@supabase/supabase-js@2'

const SITE_URL = (Deno.env.get('SITE_URL') || 'https://mayinvestcapitalstrategy.com').replace(/\/$/, '')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'Mayinvest <onboarding@resend.dev>'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

function emailHtml(link: string, kind: string) {
  const who = kind === 'commercial' ? 'votre espace commercial' : 'votre dossier'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Mayinvest</title></head>
<body style="font-family:-apple-system,Segoe UI,sans-serif;background:#F8FAFC;margin:0;padding:40px 20px;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 20px rgba(13,27,62,0.08);">
    <h1 style="color:#0D1B3E;margin:0 0 10px;font-size:22px;">Nouveau mot de passe</h1>
    <p style="color:#555;line-height:1.6;margin:0 0 24px;">Bonjour,<br/><br/>Vous avez demandé à changer le mot de passe de ${who} Mayinvest. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${link}" style="display:inline-block;background:#1A6BFF;color:#fff;padding:14px 32px;border-radius:100px;text-decoration:none;font-weight:700;font-size:15px;">Choisir un nouveau mot de passe</a>
    </div>
    <p style="color:#888;font-size:12px;line-height:1.5;margin:0 0 10px;">Ce lien est valable <strong>1 heure</strong> et ne fonctionne qu'une fois. Si vous n'avez rien demandé, ignorez cet email : votre mot de passe actuel reste valable.</p>
    <p style="color:#888;font-size:12px;line-height:1.5;margin:0;">Si le bouton ne marche pas, copiez ce lien :<br/><span style="color:#1A6BFF;word-break:break-all;">${link}</span></p>
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;"/>
    <p style="color:#999;font-size:11px;margin:0;text-align:center;">Mayinvest · Votre partenaire financement</p>
  </div>
</body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let email = ''
  let kind = ''
  try {
    const body = await req.json()
    email = String(body?.email || '').trim().toLowerCase()
    kind = String(body?.kind || '')
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200 || !['client', 'commercial'].includes(kind)) {
    return json({ error: 'bad_request' }, 400)
  }
  if (!RESEND_API_KEY) return json({ error: 'email_unavailable' }, 503)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  const { data: token, error } = await admin.rpc('mi_create_password_reset', { p_email: email, p_kind: kind })
  if (error) {
    console.error('mi_create_password_reset', error.message)
    return json({ error: 'server_error' }, 500)
  }

  if (token) {
    const link = `${SITE_URL}/reset-password?token=${token}`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: 'Mayinvest · Choisissez un nouveau mot de passe',
        html: emailHtml(link, kind),
      }),
    })
    if (!res.ok) {
      console.error('Resend', res.status, await res.text())
      return json({ error: 'email_unavailable' }, 503)
    }
  }
  // Même réponse que le compte existe ou non
  return json({ ok: true })
})
