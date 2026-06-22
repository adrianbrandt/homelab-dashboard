import { NavLink } from 'react-router-dom';
import styles from './Nav.module.css';
import { useMe } from '../hooks/useMe.ts';
import { UserChip } from './UserChip.tsx';

export function Nav() {
  const { data: me } = useMe();
  const cls = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.link} ${styles.active}` : styles.link;
  return (
    <nav className={styles.nav}>
      <div className={styles.links}>
        <NavLink to="/" end className={cls}>Overview</NavLink>
        <NavLink to="/containers" className={cls}>Containers</NavLink>
      </div>
      {me?.user ? <UserChip user={me.user} logoutUrl={me.logoutUrl} /> : null}
    </nav>
  );
}
