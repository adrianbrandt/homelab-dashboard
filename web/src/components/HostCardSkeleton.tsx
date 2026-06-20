import styles from './HostCardSkeleton.module.css';

export function HostCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={`${styles.shimmer} ${styles.title}`} />
      <div className={`${styles.shimmer} ${styles.bar}`} />
      <div className={`${styles.shimmer} ${styles.bar}`} />
      <div className={`${styles.shimmer} ${styles.bar}`} />
    </div>
  );
}
