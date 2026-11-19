// ============================================================
// Mayinvest PréSelect - Composant LeadActions
// À AJOUTER dans src/routes/admin.tsx
//
// INSTRUCTIONS DE COLLAGE:
// 1. Ouvre src/routes/admin.tsx dans l'éditeur GitHub
// 2. En haut du fichier, ajoute cet import avec les autres imports:
//
//    import { LEAD_ACTIONS, buildWhatsappUrl, fillTemplate, LIFECYCLE_STATUTS, STATUT_COLORS } from '@/lib/lead-templates'
//
// 3. Trouve la constante STATUS_COLORS existante et REMPLACE-la par:
//
//    const STATUS_COLORS = STATUT_COLORS  // on utilise la palette centralisée
//
//    (ou supprime l'ancienne ligne STATUS_COLORS et ajoute cette ligne à la place)
//
// 4. Trouve l'endroit où le dropdown de statut est rendu dans la fiche lead
//    (cherche le <select> ou la liste des statuts). REMPLACE la liste existante par:
//
//    LIFECYCLE_STATUTS.map(s => <option key={s} value={s}>{s}</option>)
//
// 5. Dans le panneau de détail du lead (après les champs d'info, avant ou après les commentaires),
//    ajoute le composant <LeadActionsPanel lead={selectedLead} /> défini ci-dessous.
//
// 6. Colle le composant LeadActionsPanel ci-dessous QUELQUE PART dans admin.tsx
//    (juste avant la dernière accolade fermante du fichier, à côté des autres helpers)
// ============================================================

function LeadActionsPanel({ lead }: { lead: DashboardLead }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [openDrawer, setOpenDrawer] = useState<string | null>(null)

  // Extraction du prénom et nom depuis identite / situation
  const identite = (lead.identite || {}) as Record<string, string>
  const situation = (lead.situation || {}) as Record<string, string>
  const prenom = identite.prenom || identite.nom || situation.raison_sociale || 'Client'
  const nom = identite.nom || ''
  const raison_sociale = situation.raison_sociale || identite.raison_sociale || ''
  const telephone = identite.telephone || identite.tel || situation.telephone || ''

  const vars = { prenom, nom, raison_sociale, telephone }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      alert('Copie impossible — sélectionne et copie le texte manuellement.')
    }
  }

  function openWhatsapp(template: string) {
    if (!telephone) {
      alert('Ce lead n\'a pas de numéro de téléphone enregistré.')
      return
    }
    const filled = fillTemplate(template, vars)
    window.open(buildWhatsappUrl(telephone, filled), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="lead-actions-panel">
      <h3 className="lap-title">
        🎯 Actions commerciales
        <span className="lap-subtitle">4 relances WhatsApp disponibles</span>
      </h3>

      {!telephone && (
        <div className="lap-warning">
          ⚠️ Aucun numéro de téléphone enregistré pour ce lead. Les scripts peuvent être copiés mais pas envoyés automatiquement.
        </div>
      )}

      <div className="lap-actions-grid">
        {LEAD_ACTIONS.map(action => {
          const isOpen = openDrawer === action.key
          const filled = fillTemplate(action.template, vars)
          return (
            <div key={action.key} className="lap-action-card" style={{ borderLeftColor: action.color }}>
              <div className="lap-action-head">
                <span className="lap-icon" aria-hidden="true">{action.icon}</span>
                <div className="lap-action-info">
                  <strong>{action.short}</strong>
                  <span className="lap-price">
                    {action.prix === 0 ? 'Gratuit' : new Intl.NumberFormat('fr-FR').format(action.prix) + ' XAF'}
                  </span>
                </div>
              </div>
              <div className="lap-action-buttons">
                <button
                  type="button"
                  className="lap-btn primary"
                  onClick={() => openWhatsapp(action.template)}
                  disabled={!telephone}
                  title={!telephone ? 'Numéro manquant' : 'Ouvrir WhatsApp avec le script pré-rempli'}
                  style={{ background: action.color }}
                >
                  📱 WhatsApp
                </button>
                <button
                  type="button"
                  className="lap-btn secondary"
                  onClick={() => copyToClipboard(filled, action.key)}
                >
                  {copiedKey === action.key ? '✓ Copié' : '📋 Copier'}
                </button>
                <button
                  type="button"
                  className="lap-btn ghost"
                  onClick={() => setOpenDrawer(isOpen ? null : action.key)}
                >
                  {isOpen ? '▲ Masquer' : '▼ Aperçu'}
                </button>
              </div>
              {isOpen && (
                <div className="lap-preview">
                  <pre>{filled}</pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
