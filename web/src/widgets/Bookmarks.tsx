import type { BookmarksData } from '@dashboard/shared';
import styles from './Bookmarks.module.css';

export function Bookmarks({ data }: { data: unknown }) {
  const { items } = data as BookmarksData;
  return (
    <ul className={styles.list}>
      {items.map((i) => (
        <li key={i.url}>
          <a href={i.url} target="_blank" rel="noreferrer">
            {i.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
