import styles from './NotAuthenticated.module.css';

export function NotAuthenticated({ logoutUrl }: { logoutUrl: string | null }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Authentication required</h1>
        <p className={styles.body}>
          Sign in through your proxy to view this dashboard.
        </p>
        {logoutUrl ? (
          <a className={styles.link} href={logoutUrl}>Sign in / out</a>
        ) : null}
      </div>
    </div>
  );
}
