import { NavLink } from 'react-router-dom';
import styles from './Nav.module.css';

export function Nav() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.link} ${styles.active}` : styles.link;
  return (
    <nav className={styles.nav}>
      <NavLink to="/" end className={cls}>Overview</NavLink>
      <NavLink to="/containers" className={cls}>Containers</NavLink>
    </nav>
  );
}
