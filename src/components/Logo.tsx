type LogoProps = { width?: number; className?: string };

/**
 * Logo Mayinvest : texte serif marine sur vagues bleu clair, fond transparent.
 * À remplacer par le fichier officiel dès réception.
 */
export function Logo({ width = 110, className = "" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 540 170"
      width={width}
      height={(width * 170) / 540}
      className={className}
      role="img"
      aria-label="Mayinvest"
      style={{ display: "block" }}
    >
      <g fill="none" stroke="#9EC6EE" strokeWidth="7" strokeLinecap="round" opacity="0.75">
        <path d="M10 44c60-26 120 26 180 0s120 26 180 0 100 18 160-4" />
        <path d="M10 70c60-26 120 26 180 0s120 26 180 0 100 18 160-4" />
        <path d="M30 128c60-26 120 26 180 0s120 26 180 0 80 16 120 0" />
      </g>
      <text
        x="270"
        y="104"
        textAnchor="middle"
        fontFamily="'Iowan Old Style', 'Palatino Linotype', Georgia, 'Times New Roman', serif"
        fontSize="74"
        letterSpacing="1"
        fill="#1B3A63"
      >
        Mayinvest
      </text>
    </svg>
  );
}
