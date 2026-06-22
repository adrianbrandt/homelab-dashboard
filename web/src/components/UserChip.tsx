import styles from './UserChip.module.css';

export function UserChip({ user, logoutUrl }: { user: string; logoutUrl: string | null }) {
  const initial = user.charAt(0).toUpperCase();
  const inner = (
    <span className={styles.chip}>
      <span className={styles.avatar} aria-hidden="true">{initial}</span>
      <span className={styles.name}>{user}</span>
    </span>
  );
  if (logoutUrl) {
    return (
      <a className={styles.link} href={logoutUrl} title="Log out">
        {inner}
      </a>
    );
  }
  return inner;
}
