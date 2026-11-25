import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import SkeletonPage from '@/components/SkeletonPage'

export const Route = createFileRoute('/equipe-admin')({
  component: EquipeAdminPage,
})

const ADMIN_SESSION_KEY = 'mayinvest_admin_session'

type Admin = {
  id: string; email: string; nom: string | null; prenom: string | null;
  ville: string | null; role: string; is_active: boolean;
  created_at: string; last_login_at: string | null;
}

const VILLES = ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Owando', 'Mossendjo']
const ROLES = [
  { k: 'director', label: 'Directeur', color: '#0F6E3E' },
  { k: 'operator', label: 'Opérateur', color: '#1A6BFF' },
  { k: 'viewer',   label: 'Lecteur',   color: '#6B7280' },
]

function EquipeAdminPage() {
  const navigate = useNavigate()
  const [authChecked, setAuthChecked] = useState(false)
  const [isDirector, setIsDirector] = useState(false)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Admin | null>(null)
  const [resetting, setResetting] = useState<Admin | null>(null)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // Auth guard (directors only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_SESSION_KEY)
      if (!raw) { navigate({ to: '/mon-espace' as any }); return }
      const s = JSON.parse(raw)
      if (!s?.email || !s?.expiresAt || s.expiresAt < Date.now()) {
        navigate({ to: '/mon-espace' as any }); return
      }
      if (s.role !== 'director') {
        navigate({ to: '/admin' as any }); return
      }
      setIsDirector(true)
      setAuthChecked(true)
    } catch { navigate({ to: '/mon-espace' as any }) }
  }, [navigate])

  async function loadAll() {
    setLoading(true)
    const { data, error } = await supabase.rpc('list_admins')
    if (!error && data) setAdmins(data as Admin[])
    setLoading(false)
  }

  useEffect(() => { if (authChecked) loadAll() }, [authChecked])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return admins
    return admins.filter(a =>
      (a.email || '').toLowerCase().includes(q) ||
      (a.nom || '').toLowerCase().includes(q) ||
      (a.prenom || '').toLowerCase().includes(q) ||
      (a.ville || '').toLowerCase().includes(q)
    )
  }, [admins, search])

  const stats = useMemo(() => ({
    total: admins.length,
    actifs: admins.filter(a => a.is_active).length,
    directors: admins.filter(a => a.role === 'director').length,
    operators: admins.filter(a => a.role === 'operator').length,
  }), [admins])

  async function handleCreate(form: NewAdminForm) {
    const { error } = await supabase.rpc('create_admin', {
      p_email: form.email, p_password: form.password, p_nom: form.nom,
      p_prenom: form.prenom, p_ville: form.ville, p_role: form.role,
    })
    if (error) { setNotice({ type: 'err', msg: error.message }); return }
    setNotice({ type: 'ok', msg: `Admin ${form.prenom} ${form.nom} créé avec succès.` })
    setShowAdd(false)
    await loadAll()
  }

  async function handleUpdate(a: Admin, patch: Partial<Admin>) {
    const { error } = await supabase.rpc('update_admin_info', {
      p_id: a.id, p_nom: patch.nom ?? a.nom, p_prenom: patch.prenom ?? a.prenom,
      p_ville: patch.ville ?? a.ville, p_role: patch.role ?? a.role,
    })
    if (error) { setNotice({ type: 'err', msg: error.message }); return }
    setNotice({ type: 'ok', msg: 'Informations mises à jour.' })
    setEditing(null)
    await loadAll()
  }

  async function handleToggleActive(a: Admin) {
    const { error } = await supabase.rpc('toggle_admin_active', { p_id: a.id, p_active: !a.is_active })
    if (error) { setNotice({ type: 'err', msg: error.message }); return }
    setNotice({ type: 'ok', msg: `Compte ${!a.is_active ? 'activé' : 'désactivé'}.` })
    await loadAll()
  }

  async function handleResetPassword(a: Admin, pwd: string) {
    const { error } = await supabase.rpc('reset_admin_password', { p_id: a.id, p_new_password: pwd })
    if (error) { setNotice({ type: 'err', msg: error.message }); return }
    setNotice({ type: 'ok', msg: `Nouveau mot de passe défini pour ${a.email}.` })
    setResetting(null)
  }

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(t)
  }, [notice])

  if (!authChecked) return <SkeletonPage label="Vérification de la session…" />
  if (loading) return <SkeletonPage label="Chargement des administrateurs…" />

  return (
    <div className="ea-root">
      <style>{CSS}</style>

      <header className="ea-header">
        <div className="ea-header-left">
          <Link to="/admin" className="back-round" aria-label="Retour à l'admin">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <nav className="ea-nav">
            <Link to={'/candidatures' as any}>Candidatures</Link>
            <Link to={'/equipe-commerciale' as any}>Commerciaux</Link>
            <Link to={'/equipe-admin' as any} className="active">Admins</Link>
          </nav>
        </div>
        <div className="ea-header-right">
          <h1>Équipe administration</h1>
          <div className="ea-sub">Directeurs · Opérateurs · Lecteurs</div>
        </div>
      </header>

      <div className="wrap">
        {notice && (
          <div className={`notice ${notice.type}`}>
            {notice.type === 'ok' ? '✓ ' : '⚠ '}{notice.msg}
            <button onClick={() => setNotice(null)} aria-label="Fermer">✕</button>
          </div>
        )}

        <div className="kpi-row">
          <div className="kpi"><div className="kpi-lbl">Total</div><div className="kpi-val">{stats.total}</div></div>
          <div className="kpi"><div className="kpi-lbl">Actifs</div><div className="kpi-val" style={{ color: '#0F6E3E' }}>{stats.actifs}</div></div>
          <div className="kpi"><div className="kpi-lbl">Directeurs</div><div className="kpi-val">{stats.directors}</div></div>
          <div className="kpi"><div className="kpi-lbl">Opérateurs</div><div className="kpi-val">{stats.operators}</div></div>
        </div>

        <div className="toolbar">
          <input placeholder="Rechercher par nom, email, ville…" value={search} onChange={e => setSearch(e.target.value)}/>
          <button className="btn-add" onClick={() => setShowAdd(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Ajouter un admin
          </button>
        </div>

        <div className="table-wrap">
          <table className="ea-table">
            <thead>
              <tr>
                <th>Admin</th><th>Email</th><th>Ville</th><th>Rôle</th><th>Statut</th><th>Dernière connexion</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="empty">Aucun administrateur ne correspond.</td></tr>
              ) : filtered.map(a => {
                const role = ROLES.find(r => r.k === a.role) || ROLES[1]
                const initials = ((a.prenom?.[0] || '') + (a.nom?.[0] || '')).toUpperCase() || a.email[0].toUpperCase()
                const fullName = [a.prenom, a.nom].filter(Boolean).join(' ') || '—'
                const lastLogin = a.last_login_at ? new Date(a.last_login_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Jamais'
                return (
                  <tr key={a.id} className={!a.is_active ? 'inactive' : ''}>
                    <td>
                      <div className="cell-user">
                        <div className="avatar">{initials}</div>
                        <div>
                          <div className="name">{fullName}</div>
                          <div className="meta">{new Date(a.created_at).toLocaleDateString('fr-FR')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{a.email}</td>
                    <td>{a.ville || '—'}</td>
                    <td><span className="role-pill" style={{ background: role.color + '18', color: role.color }}>{role.label}</span></td>
                    <td>
                      <button className={`status-toggle ${a.is_active ? 'on' : 'off'}`} onClick={() => handleToggleActive(a)} title={a.is_active ? 'Désactiver' : 'Activer'}>
                        <span className="dot"/>{a.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="small">{lastLogin}</td>
                    <td className="actions">
                      <button onClick={() => setEditing(a)} title="Modifier">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => setResetting(a)} title="Réinitialiser le mot de passe">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddAdminModal onClose={() => setShowAdd(false)} onSubmit={handleCreate}/>}
      {editing && <EditAdminModal admin={editing} onClose={() => setEditing(null)} onSubmit={(patch) => handleUpdate(editing, patch)}/>}
      {resetting && <ResetPwdModal admin={resetting} onClose={() => setResetting(null)} onSubmit={(pwd) => handleResetPassword(resetting, pwd)}/>}
    </div>
  )
}

// ============================================================
// MODAL : Ajouter un admin
// ============================================================
type NewAdminForm = { email: string; password: string; nom: string; prenom: string; ville: string; role: string }

function AddAdminModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (f: NewAdminForm) => void }) {
  const [form, setForm] = useState<NewAdminForm>({ email: '', password: '', nom: '', prenom: '', ville: 'Brazzaville', role: 'operator' })
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!form.email || !form.password || !form.nom || !form.prenom) { setErr('Tous les champs sont obligatoires.'); return }
    if (form.password.length < 8) { setErr('Le mot de passe doit faire au moins 8 caractères.'); return }
    setSubmitting(true)
    await onSubmit(form)
    setSubmitting(false)
  }

  return (
    <div className="modal-ovr" onClick={onClose}>
      <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h3>Nouvel administrateur</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <Field label="Prénom" value={form.prenom} onChange={v => setForm({ ...form, prenom: v })}/>
            <Field label="Nom" value={form.nom} onChange={v => setForm({ ...form, nom: v })}/>
          </div>
          <Field label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })}/>
          <Field label="Mot de passe temporaire (min. 8 caractères)" type="text" value={form.password} onChange={v => setForm({ ...form, password: v })}/>
          <FieldSelect label="Ville" value={form.ville} onChange={v => setForm({ ...form, ville: v })} options={VILLES}/>
          <FieldSelect label="Rôle" value={form.role} onChange={v => setForm({ ...form, role: v })} options={ROLES.map(r => r.k)} labels={Object.fromEntries(ROLES.map(r => [r.k, r.label]))}/>
          {err && <div className="field-err">⚠ {err}</div>}
        </div>
        <div className="modal-actions stacked">
          <PillBtn type="submit" disabled={submitting}>{submitting ? 'Création…' : 'Créer l\'admin'}</PillBtn>
          <PillBtn type="button" variant="ghost" onClick={onClose}>Annuler</PillBtn>
        </div>
      </form>
    </div>
  )
}

// ============================================================
// MODAL : Éditer un admin
// ============================================================
function EditAdminModal({ admin, onClose, onSubmit }: { admin: Admin; onClose: () => void; onSubmit: (patch: Partial<Admin>) => void }) {
  const [form, setForm] = useState({ nom: admin.nom || '', prenom: admin.prenom || '', ville: admin.ville || 'Brazzaville', role: admin.role })
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); await onSubmit(form); setSubmitting(false)
  }

  return (
    <div className="modal-ovr" onClick={onClose}>
      <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h3>Modifier · {admin.email}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <Field label="Prénom" value={form.prenom} onChange={v => setForm({ ...form, prenom: v })}/>
            <Field label="Nom" value={form.nom} onChange={v => setForm({ ...form, nom: v })}/>
          </div>
          <FieldSelect label="Ville" value={form.ville} onChange={v => setForm({ ...form, ville: v })} options={VILLES}/>
          <FieldSelect label="Rôle" value={form.role} onChange={v => setForm({ ...form, role: v })} options={ROLES.map(r => r.k)} labels={Object.fromEntries(ROLES.map(r => [r.k, r.label]))}/>
        </div>
        <div className="modal-actions stacked">
          <PillBtn type="submit" disabled={submitting}>{submitting ? 'Sauvegarde…' : 'Enregistrer les modifications'}</PillBtn>
          <PillBtn type="button" variant="ghost" onClick={onClose}>Annuler</PillBtn>
        </div>
      </form>
    </div>
  )
}

// ============================================================
// MODAL : Reset password
// ============================================================
function ResetPwdModal({ admin, onClose, onSubmit }: { admin: Admin; onClose: () => void; onSubmit: (pwd: string) => void }) {
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (pwd.length < 8) { setErr('Minimum 8 caractères.'); return }
    setSubmitting(true); await onSubmit(pwd); setSubmitting(false)
  }

  return (
    <div className="modal-ovr" onClick={onClose}>
      <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h3>Réinitialiser le mot de passe</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="hint">Pour <b>{admin.email}</b>. Transmets le nouveau mot de passe à la personne concernée après avoir cliqué sur Enregistrer.</p>
          <Field label="Nouveau mot de passe (min. 8 caractères)" type="text" value={pwd} onChange={setPwd}/>
          {err && <div className="field-err">⚠ {err}</div>}
        </div>
        <div className="modal-actions stacked">
          <PillBtn type="submit" variant="danger" disabled={submitting}>{submitting ? 'Reset…' : 'Réinitialiser le mot de passe'}</PillBtn>
          <PillBtn type="button" variant="ghost" onClick={onClose}>Annuler</PillBtn>
        </div>
      </form>
    </div>
  )
}

// ============================================================
// Mini composants form
// ============================================================
function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}/>
    </div>
  )
}

function FieldSelect({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <div className="field chips-field">
      <label>{label}</label>
      <div className="chips">
        {options.map(o => (
          <button
            key={o}
            type="button"
            className={`chip${value === o ? ' active' : ''}`}
            onClick={() => onChange(o)}
          >
            {labels?.[o] || o}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Petit composant bouton pill (icône + texte + flèche) — style landing page */
function PillBtn({ children, type = 'button', onClick, disabled, variant = 'primary' }:
  { children: React.ReactNode; type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'ghost' | 'danger' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`pill-btn pill-${variant}`}>
      <span className="pill-ic">
        {variant === 'ghost' ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : variant === 'danger' ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        )}
      </span>
      <span className="pill-tx">{children}</span>
      {!disabled && (
        <span className="pill-ar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </span>
      )}
    </button>
  )
}

// ============================================================
// CSS
// ============================================================
const CSS = `
  * { box-sizing: border-box; }
  .ea-root { min-height: 100vh; background: #FAFAF8; font-family: 'Inter', system-ui, sans-serif; color: #0F1729; }

  .ea-header { padding: 20px 32px; background: #FFFFFF; margin: 20px 32px 0; border-radius: 16px; box-shadow: 0 2px 4px rgba(13,23,41,0.03); border: 1px solid #ECECEA; display: flex; align-items: center; gap: 20px; }
  @media (max-width: 640px) { .ea-header { margin: 12px 16px 0; padding: 16px 20px; gap: 14px; } }
  .ea-header-left { flex: 1; display: flex; align-items: center; gap: 16px; }
  .ea-header-right { text-align: right; }
  .ea-header h1 { font-size: 22px; font-weight: 800; margin: 0; color: #0F1729; letter-spacing: -0.02em; line-height: 1.1; }
  @media (max-width: 640px) { .ea-header h1 { font-size: 18px; } }
  .ea-sub { font-size: 12px; color: #6B7280; margin-top: 4px; }
  .back-round { width: 40px; height: 40px; border-radius: 50%; background: #F3F4F6; border: 1px solid #E5E7EB; display: inline-flex; align-items: center; justify-content: center; color: #111; cursor: pointer; flex-shrink: 0; text-decoration: none; transition: all 0.15s; }
  .back-round:hover { background: #0D1B3E; color: #fff; border-color: #0D1B3E; transform: translateX(-2px); }

  .ea-nav { display: flex; gap: 4px; background: #F3F3F1; border-radius: 10px; padding: 4px; }
  .ea-nav a { padding: 7px 14px; border-radius: 7px; font-size: 12.5px; font-weight: 600; color: #6B7280; text-decoration: none; transition: all 0.15s; }
  .ea-nav a:hover { color: #0F1729; }
  .ea-nav a.active { background: #FFFFFF; color: #0F6E3E; box-shadow: 0 1px 2px rgba(17,24,39,0.06); }

  .wrap { padding: 24px 32px 40px; max-width: 1400px; margin: 0 auto; }
  @media (max-width: 640px) { .wrap { padding: 16px; } }

  .notice { padding: 11px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .notice.ok { background: #D1FAE5; color: #065F46; border: 1px solid #A7F3D0; }
  .notice.err { background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }
  .notice button { background: transparent; border: none; cursor: pointer; color: inherit; opacity: 0.6; font-size: 14px; }
  .notice button:hover { opacity: 1; }

  .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .kpi { background: #FFFFFF; border: 1px solid #ECECEA; border-radius: 12px; padding: 16px; box-shadow: 0 1px 2px rgba(17,24,39,0.03); }
  .kpi-lbl { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7280; margin-bottom: 8px; }
  .kpi-val { font-size: 24px; font-weight: 800; color: #0F1729; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }

  .toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
  .toolbar input { flex: 1; padding: 11px 14px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 13px; font-family: inherit; color: #0F1729; }
  .toolbar input:focus { outline: none; border-color: #0F6E3E; box-shadow: 0 0 0 3px rgba(15,110,62,0.12); }
  .btn-add { padding: 11px 18px; background: #0F6E3E; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-family: inherit; transition: all 0.15s; box-shadow: 0 4px 12px rgba(15,110,62,0.2); }
  .btn-add:hover { background: #0A4E2C; transform: translateY(-1px); }

  .table-wrap { background: #FFFFFF; border: 1px solid #ECECEA; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(17,24,39,0.03); overflow-x: auto; }
  .ea-table { width: 100%; border-collapse: collapse; min-width: 800px; }
  .ea-table th { padding: 12px 14px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7280; background: #FAFAF8; border-bottom: 1px solid #ECECEA; }
  .ea-table td { padding: 14px; font-size: 13px; color: #0F1729; border-bottom: 1px solid #F3F3F1; vertical-align: middle; }
  .ea-table tr:last-child td { border-bottom: none; }
  .ea-table tr.inactive { opacity: 0.55; }
  .ea-table .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #374151; }
  .ea-table .small { font-size: 11.5px; color: #6B7280; }
  .ea-table .empty { text-align: center; padding: 40px; color: #9CA3AF; font-style: italic; }

  .cell-user { display: flex; align-items: center; gap: 10px; }
  .avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #0F6E3E, #0A4E2C); color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0; letter-spacing: 0.02em; }
  .cell-user .name { font-weight: 600; font-size: 13px; }
  .cell-user .meta { font-size: 10.5px; color: #9CA3AF; margin-top: 1px; }

  .role-pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em; }

  .status-toggle { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; transition: filter 0.15s; }
  .status-toggle:hover { filter: brightness(0.95); }
  .status-toggle .dot { width: 6px; height: 6px; border-radius: 50%; }
  .status-toggle.on { background: #D1FAE5; color: #065F46; }
  .status-toggle.on .dot { background: #22C55E; }
  .status-toggle.off { background: #F3F3F1; color: #6B7280; }
  .status-toggle.off .dot { background: #9CA3AF; }

  .actions { display: flex; gap: 6px; }
  .actions button { background: #F3F3F1; border: none; border-radius: 8px; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; color: #6B7280; cursor: pointer; transition: all 0.15s; }
  .actions button:hover { background: #0F6E3E; color: white; }

  /* ===== Modales ===== */
  .modal-ovr { position: fixed; inset: 0; background: rgba(13,23,41,0.6); backdrop-filter: blur(4px); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: white; border-radius: 16px; max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(13,23,41,0.2); }
  .modal-head { padding: 20px 24px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #F3F3F1; }
  .modal-head h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0F1729; letter-spacing: -0.01em; }
  .modal-close { background: #F3F3F1; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; color: #6B7280; font-size: 14px; }
  .modal-close:hover { background: #ECECEA; color: #0F1729; }
  .modal-body { padding: 18px 24px; }
  .modal-body .hint { font-size: 13px; color: #6B7280; margin: 0 0 14px; line-height: 1.5; }
  .modal-body .hint b { color: #0F1729; font-weight: 600; }
  .modal-actions { padding: 18px 24px 22px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #F3F3F1; background: #FAFAF8; }
  .modal-actions.stacked { flex-direction: column; }

  /* === Pill buttons (icône + texte + flèche), style landing === */
  .pill-btn { width: 100%; padding: 13px 20px; border-radius: 999px; border: none; font-size: 13.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; text-align: left; font-family: inherit; transition: all 0.15s; }
  .pill-ic { width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.18); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pill-tx { flex: 1; }
  .pill-ar { width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.18); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pill-primary { background: #0F6E3E; color: #fff; box-shadow: 0 6px 16px rgba(15,110,62,0.25); }
  .pill-primary:hover:not(:disabled) { background: #0A4E2C; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(15,110,62,0.32); }
  .pill-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .pill-ghost { background: transparent; color: #0F1729; border: 1.5px solid #ECECEA; }
  .pill-ghost .pill-ic { background: #F3F3F1; color: #6B7280; }
  .pill-ghost .pill-ar { background: #F3F3F1; color: #6B7280; }
  .pill-ghost:hover:not(:disabled) { background: #F3F3F1; border-color: #E5E5E3; }
  .pill-danger { background: #B42318; color: #fff; box-shadow: 0 6px 16px rgba(180,35,24,0.22); }
  .pill-danger:hover:not(:disabled) { background: #951810; transform: translateY(-1px); }
  .pill-danger:disabled { opacity: 0.6; cursor: not-allowed; }

  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
  @media (max-width: 480px) { .field-row { grid-template-columns: 1fr; } }
  .field { margin-bottom: 14px; }
  .field label { display: block; font-size: 11px; font-weight: 600; color: #6B7280; margin-bottom: 6px; letter-spacing: 0.02em; }
  .field input { width: 100%; padding: 11px 14px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 13px; font-family: inherit; color: #0F1729; transition: all 0.15s; }
  .field input:focus { outline: none; border-color: #0F6E3E; box-shadow: 0 0 0 3px rgba(15,110,62,0.12); }
  .field-err { background: #FEE2E2; color: #991B1B; padding: 9px 12px; border-radius: 8px; font-size: 12px; margin-top: 8px; display: flex; align-items: center; gap: 6px; }

  /* === Chips segmentés (remplace les selects) === */
  .chips-field { grid-column: 1 / -1; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { padding: 8px 14px; background: #F3F3F1; border: 1px solid transparent; border-radius: 999px; font-size: 12.5px; font-weight: 600; color: #6B7280; cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .chip:hover { background: #ECECEA; color: #0F1729; }
  .chip.active { background: #0F6E3E; color: #fff; border-color: #0F6E3E; box-shadow: 0 4px 10px rgba(15,110,62,0.2); }
`
