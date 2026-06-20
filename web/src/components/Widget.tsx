import { useWidget } from '../hooks/useWidget.ts';
import { widgetRegistry } from '../widgets/registry.ts';
import styles from './Widget.module.css';

export function Widget({ id, type }: { id: string; type: string }) {
  const Comp = widgetRegistry.get(type);
  const { data: result, isPending, isError } = useWidget(id, !!Comp);

  if (!Comp) {
    return <div className={styles.widget}>Unknown widget: {type}</div>;
  }
  return (
    <div className={styles.widget}>
      {isPending && !result && <div className={styles.muted}>loading…</div>}
      {result && !result.ok && <div className={styles.error}>unavailable — {result.error}</div>}
      {result && result.ok && <Comp data={result.data} />}
      {isError && !result && <div className={styles.muted}>unavailable</div>}
    </div>
  );
}
