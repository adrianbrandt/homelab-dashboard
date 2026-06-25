import { NavLink } from 'react-router-dom';
import styles from './Nav.module.css';
import { useMe } from '../hooks/useMe.ts';
import { useTheme } from '../hooks/useTheme.ts';
import { UserChip } from './UserChip.tsx';

const THEME_GLYPH = { dark: '☾', light: '☀', auto: '◑' } as const;

export function Nav() {
  const { data: me } = useMe();
  const { mode, density, cycleMode, toggleDensity } = useTheme();
  const cls = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.link} ${styles.active}` : styles.link;
  return (
    <nav className={styles.nav}>
      <div className={styles.links}>
        <NavLink to="/" end className={cls}>Overview</NavLink>
        <NavLink to="/containers" className={cls}>Containers</NavLink>
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={cycleMode}
          aria-label={`Theme: ${mode}`}
          title={`Theme: ${mode}`}
        >
          {THEME_GLYPH[mode]}
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={toggleDensity}
          aria-label={`Density: ${density}`}
          aria-pressed={density === 'compact'}
          title={`Density: ${density}`}
        >
          {density === 'compact' ? '▤' : '▦'}
        </button>
        {me?.user ? <UserChip user={me.user} logoutUrl={me.logoutUrl} /> : null}
      </div>
    </nav>
  );
}
