import type { HostStatus } from '@dashboard/shared';
import styles from './StatusDot.module.css';

export function StatusDot({ status }: { status: HostStatus }) {
  return <span data-testid="status-dot" data-status={status} className={`${styles.dot} ${styles[status]}`} />;
}
