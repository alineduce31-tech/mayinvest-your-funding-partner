import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import SkeletonPage from '@/components/SkeletonPage'
import AdminMessagerie from '@/components/AdminMessagerie'

export const Route = createFileRoute('/messagerie')({
  head: () => ({ meta: [{ title: 'Messagerie · Mayinvest PréSelect' }, { name: 'robots', content: 'noindex' }] }),
  validateSearch: (search: Record<string, unknown>): { lead?: string | undefined } => ({
    lead: typeof search['lead'] === 'string' && /^[0-9a-f-]{36}$/i.test(search['lead']) ? search['lead'] : undefined,
  }),
  component: MessageriePage,
})

function MessageriePage() {
  const navigate = useNavigate()
  const { lead } = Route.useSearch()
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mayinvest_admin_session')
      const s = raw ? JSON.parse(raw) : null
      if (!s?.token || !s?.expiresAt || s.expiresAt < Date.now()) {
        navigate({ to: '/mon-espace' })
        return
      }
      setSession(s)
    } catch {
      navigate({ to: '/mon-espace' })
    }
  }, [navigate])

  if (!session) return <SkeletonPage label="Ouverture de la messagerie…" />

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif", background: '#F5F7FB', color: '#0F1729' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`body { margin: 0; }`}</style>
      <AdminMessagerie
        session={session}
        initialLeadId={lead}
        onBack={() => navigate({ to: '/admin' })}
        onOpenLead={(lead) => navigate({ to: '/admin', search: { view: 'crm', lead: lead.id } as any })}
        onLeadChanged={() => {}}
      />
    </div>
  )
}
