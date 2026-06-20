import type { SeriesPoint } from '@dashboard/shared';
import styles from './Sparkline.module.css';

interface Props {
  points: SeriesPoint[];
  width?: number;
  height?: number;
  formatValue?: (v: number) => string;
}

export function Sparkline({ points, width = 200, height = 40, formatValue }: Props) {
  const real = points.filter((p) => p.v != null) as { t: number; v: number }[];
  if (real.length < 2) return <div className={styles.empty}>no data</div>;

  const values = real.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = points.length;
  const x = (i: number) => (n === 1 ? 0 : (i / (n - 1)) * width);
  const y = (v: number) => height - ((v - min) / span) * height;

  // Build contiguous segments, breaking on null so gaps don't draw a flat line.
  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((p, i) => {
    if (p.v == null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
    } else {
      current.push(`${x(i).toFixed(1)},${y(p.v).toFixed(1)}`);
    }
  });
  if (current.length > 1) segments.push(current.join(' '));

  const last = real[real.length - 1].v;
  const label = formatValue ? formatValue(last) : String(Math.round(last));

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="trend"
      >
        {segments.map((pts, i) => (
          <polyline key={i} className={styles.line} points={pts} />
        ))}
      </svg>
      <span className={styles.value}>{label}</span>
    </div>
  );
}
