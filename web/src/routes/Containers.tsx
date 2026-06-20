import { useContainers } from '../hooks/useContainers.ts';
import { ContainerTable } from '../components/ContainerTable.tsx';
import styles from './Containers.module.css';

export function Containers() {
  const { data, isPending, isError, dataUpdatedAt } = useContainers();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Containers</h1>
        {isError && data && (
          <span className={styles.stale}>
            reconnecting… last update {new Date(dataUpdatedAt).toLocaleTimeString()}
          </span>
        )}
      </header>

      {isError && !data && <p className={styles.error}>Could not reach the dashboard API.</p>}
      {isPending && <p className={styles.loading}>Loading…</p>}
      {data && <ContainerTable containers={data.containers} />}
    </div>
  );
}
