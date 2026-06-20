import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sonarr } from './Sonarr.tsx';
import { Radarr } from './Radarr.tsx';
import { Adguard } from './Adguard.tsx';

describe('service tiles', () => {
  it('Sonarr shows queue/series/upcoming', () => {
    render(<Sonarr data={{ queue: 2, series: 180, upcoming: 5 }} />);
    expect(screen.getByText('Sonarr')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
  });
  it('Radarr shows queue/movies/missing', () => {
    render(<Radarr data={{ queue: 0, movies: 320, missing: 12 }} />);
    expect(screen.getByText('Radarr')).toBeInTheDocument();
    expect(screen.getByText('320')).toBeInTheDocument();
  });
  it('Adguard shows queries/blocked/%', () => {
    render(<Adguard data={{ queries: 48200, blocked: 8600, blockedPct: 18 }} />);
    expect(screen.getByText('AdGuard')).toBeInTheDocument();
    expect(screen.getByText('18%')).toBeInTheDocument();
  });
});
