import { useMemo } from 'react'
import qrcode from '@/lib/vendor/qrcode-generator'

function chemin(data: string): { n: number; d: string } {
  const qr = qrcode(0, 'M')
  qr.addData(data)
  qr.make()
  const n = qr.getModuleCount()
  const rects: string[] = []
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) rects.push(`M${c} ${r}h1v1h-1z`)
  return { n, d: rects.join('') }
}

/** QR code dessiné en SVG, sans service externe. */
export function QrSvg({ data, size = 176, label = 'QR code', couleur = '#0D1B3E' }: { data: string; size?: number; label?: string; couleur?: string }) {
  const cells = useMemo(() => chemin(data), [data])
  const m = 2
  return (
    <svg width={size} height={size} viewBox={`${-m} ${-m} ${cells.n + m * 2} ${cells.n + m * 2}`} shapeRendering="crispEdges" role="img" aria-label={label}>
      <rect x={-m} y={-m} width={cells.n + m * 2} height={cells.n + m * 2} fill="#fff"/>
      <path d={cells.d} fill={couleur}/>
    </svg>
  )
}

/** Télécharge le QR code en image PNG (1024 px), prêt à imprimer sur un flyer. */
export async function telechargerQr(data: string, nomFichier: string): Promise<void> {
  const { n, d } = chemin(data)
  const m = 3
  const t = n + m * 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${-m} ${-m} ${t} ${t}" shape-rendering="crispEdges"><rect x="${-m}" y="${-m}" width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#0D1B3E"/></svg>`
  const img = new Image()
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  await new Promise<void>((ok, ko) => { img.onload = () => ok(); img.onerror = () => ko(new Error('QR')); img.src = url })
  const canvas = document.createElement('canvas')
  canvas.width = 1024; canvas.height = 1024
  canvas.getContext('2d')!.drawImage(img, 0, 0, 1024, 1024)
  URL.revokeObjectURL(url)
  const blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/png'))
  if (!blob) return
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nomFichier
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
