import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { requestPasswordReset, type ResetKind as Kind } from '@/lib/password-reset'
import { AuthStyles, AuthHeader, AuthTitle, AuthTabs, IconKey, AlertIcon } from '@/components/AuthUI'

export const Route = createFileRoute('/mot-de-passe-oublie')({
  component: MotDePasseOublie,
})


function MotDePasseOublie() {
  const navigate = useNavigate()
  const [kind, setKind] = useState<Kind>('client')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('type')
    if (t === 'commercial' || t === 'client') setKind(t)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setResult(await requestPasswordReset(email, kind))
    setBusy(false)
  }

  const loginPath = kind === 'commercial' ? '/espace-commercial' : '/mon-dossier'

  return (
    <div className="ac-page">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <AuthStyles />
      <AuthHeader onBack={() => navigate({ to: loginPath as any })} backLabel="Connexion" />
      <div className="ac-wrap">
        <div className="ac-card">
          <AuthTitle icon={<IconKey />} title="Mot de passe oublié" subtitle="Entrez l'email de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe." />
          <form onSubmit={submit}>
            <AuthTabs value={kind} onChange={(v) => { setKind(v); setResult(null) }} options={[
              { value: 'client', label: 'Je suis client' },
              { value: 'commercial', label: 'Je suis commercial' },
            ]} />
            <div className="ac-field">
              <label>Email du compte</label>
              <input type="email" placeholder="Ex : vous@exemple.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <button type="submit" className="ac-btn" disabled={busy || !email.includes('@')}>
              {busy ? 'Envoi…' : 'Recevoir le lien par email'}
            </button>
            {result && (result.ok
              ? <div className="ac-ok">{result.message}</div>
              : <div className="ac-err"><AlertIcon />{result.message}</div>)}
          </form>
          <div className="ac-foot">
            Vous vous souvenez ? <Link to={loginPath as any}>Se connecter</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
