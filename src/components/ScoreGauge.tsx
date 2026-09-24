export function ScoreGauge({ score, size = 180 }: { score: number; size?: number }) {
  const stroke = Math.max(8, Math.round(size / 16));
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const value = Math.min(100, Math.max(0, score));
  const offset = c * (1 - value / 100);

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score de bancabilité : ${value} sur 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-accent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="stroke-signal transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-semibold leading-none text-foreground"
          style={{ fontSize: size * 0.28 }}
        >
          {value}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">sur 100</span>
      </div>
    </div>
  );
}
