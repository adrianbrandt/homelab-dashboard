import { Link } from 'react-router-dom';
import { useHosts } from '../hooks/useHosts.ts';
import { useLayout } from '../hooks/useLayout.ts';
import { HostCard } from '../components/HostCard.tsx';
import { HostCardSkeleton } from '../components/HostCardSkeleton.tsx';
import { FleetSummary } from '../components/FleetSummary.tsx';
import { Widget } from '../components/Widget.tsx';
import styles from './Overview.module.css';

export function Overview() {
  const { data, isPending, isError, dataUpdatedAt } = useHosts();
  const { data: layout } = useLayout();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Homelab</h1>
        {isError && data && (
          <span className={styles.stale}>
            reconnecting… last update {new Date(dataUpdatedAt).toLocaleTimeString()}
          </span>
        )}
      </header>

      {data && data.hosts.length > 0 && (
        <FleetSummary hosts={data.hosts} updatedAt={dataUpdatedAt} />
      )}

      {isError && !data && <p className={styles.error}>Could not reach the dashboard API.</p>}

      <div className={styles.grid}>
        {isPending &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} data-testid="skeleton">
              <HostCardSkeleton />
            </div>
          ))}
        {data && data.hosts.length === 0 && (
          <p className={styles.empty}>No hosts configured — add one in config.</p>
        )}
        {data &&
          data.hosts.map((h) =>
            h.kind === 'storage' ? (
              <div key={h.id} className={styles.cardLink}>
                <HostCard host={h} />
              </div>
            ) : (
              <Link key={h.id} to={`/host/${h.id}`} className={styles.cardLink}>
                <HostCard host={h} />
              </Link>
            ),
          )}
      </div>

      {layout?.groups.map((g) => (
        <section key={g.name} className={styles.group}>
          <h2 className={styles.groupTitle}>{g.name}</h2>
          <div className={styles.widgetGrid}>
            {g.widgets.map((w) => (
              <Widget key={w.id} id={w.id} type={w.type} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
