import { Link } from '@tanstack/react-router'
import { ArrowLeft, ClipboardCheck, Users, ShieldCheck } from 'lucide-react'

type Onglet = 'candidatures' | 'commerciaux' | 'admins'

/** Navigation commune des pages Équipe : retour admin + trois onglets en contrôle segmenté. */
export default function EquipeNav({ actif }: { actif: Onglet }) {
  const items: { k: Onglet; to: string; label: string; icon: React.ReactNode }[] = [
    { k: 'candidatures', to: '/candidatures', label: 'Candidatures', icon: <ClipboardCheck size={15}/> },
    { k: 'commerciaux', to: '/equipe-commerciale', label: 'Commerciaux', icon: <Users size={15}/> },
    { k: 'admins', to: '/equipe-admin', label: 'Admins', icon: <ShieldCheck size={15}/> },
  ]
  return (
    <div className="eq-navbar">
      <Link to="/admin" className="eq-back" aria-label="Retour à l'admin"><ArrowLeft size={16}/></Link>
      <nav className="eq-seg" aria-label="Équipe">
        {items.map(i => (
          <Link key={i.k} to={i.to as any} className={actif === i.k ? 'on' : ''} aria-current={actif === i.k ? 'page' : undefined}>{i.icon}<span>{i.label}</span></Link>
        ))}
      </nav>
    </div>
  )
}
