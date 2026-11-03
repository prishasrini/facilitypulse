interface SparklineProps {
  values: number[];
  label: string;
  width?: number;
  height?: number;
}

/** Tiny trend line drawn with plain SVG — no chart library needed. */
export function Sparkline({ values, label, width = 120, height = 32 }: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // avoid dividing by zero on a flat line
  const pad = 2;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`${label}: ranged ${min} to ${max} over the last ${values.length} readings`}
      preserveAspectRatio="none"
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
