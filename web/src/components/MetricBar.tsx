import styles from './MetricBar.module.css';

export function MetricBar({
  label,
  valueText,
  percent,
  status,
}: {
  label: string;
  valueText: string;
  percent: number;
  status: 'ok' | 'warn';
}) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div className={styles.metric}>
      <div className={styles.label}>
        <span>{label}</span>
        <span>{valueText}</span>
      </div>
      <div className={styles.bar}>
        <div
          data-testid="fill"
          className={`${styles.fill} ${status === 'warn' ? styles.warn : ''}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
