import styles from './StatTile.module.css';

export interface Metric {
  label: string;
  value: string | number;
}

export function StatTile({ title, metrics }: { title: string; metrics: Metric[] }) {
  return (
    <div className={styles.tile}>
      <div className={styles.title}>{title}</div>
      <div className={styles.metrics}>
        {metrics.map((m) => (
          <div key={m.label} className={styles.metric}>
            <span className={styles.value}>{m.value}</span>
            <span className={styles.label}>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
