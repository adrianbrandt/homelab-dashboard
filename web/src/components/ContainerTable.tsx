import type { Container } from '@dashboard/shared';
import { formatContainerMem, formatUptime } from '../format.ts';
import styles from './ContainerTable.module.css';

export function ContainerTable({ containers }: { containers: Container[] }) {
  if (containers.length === 0) {
    return <p className={styles.empty}>No containers reported.</p>;
  }
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Image</th>
            <th className={styles.num}>CPU</th>
            <th className={styles.num}>Memory</th>
            <th className={styles.num}>Uptime</th>
          </tr>
        </thead>
        <tbody>
          {containers.map((c) => (
            <tr key={c.name}>
              <td className={styles.name}>{c.name}</td>
              <td className={styles.image}>{c.image}</td>
              <td className={styles.num}>{c.cpuPercent.toFixed(1)}%</td>
              <td className={styles.num}>{formatContainerMem(c.memUsedBytes, c.memLimitBytes)}</td>
              <td className={styles.num}>{formatUptime(c.uptimeSeconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
