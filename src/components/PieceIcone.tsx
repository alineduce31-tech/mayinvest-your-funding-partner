import { IdCard, Receipt, Landmark, FileBadge, Building2, FileText, File as FileIcon } from 'lucide-react'
import { iconePiece } from '@/lib/affichage'

const ICONES = {
  id: IdCard, salaire: Receipt, banque: Landmark, attestation: FileBadge,
  societe: Building2, fiscal: FileText, doc: FileIcon,
} as const

/** Icône d'une pièce du dossier (CNI, bulletin, relevé…), la même dans toutes les messageries. */
export default function PieceIcone({ docType, titre, size = 16 }: { docType?: string | null; titre: string; size?: number }) {
  const I = ICONES[iconePiece(docType, titre) as keyof typeof ICONES] || FileIcon
  return <I size={size}/>
}
