import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sonarr } from './Sonarr.tsx';
import { Radarr } from './Radarr.tsx';
import { Adguard } from './Adguard.tsx';
import { Prowlarr } from './Prowlarr.tsx';
import { Overseerr } from './Overseerr.tsx';
import { Plex } from './Plex.tsx';
import { Qbittorrent } from './Qbittorrent.tsx';

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
  it('Prowlarr shows indexers/enabled/grabs/queries', () => {
    render(<Prowlarr data={{ indexers: 8, enabled: 6, grabs: 142, queries: 3300 }} />);
    expect(screen.getByText('Prowlarr')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
  });
  it('Overseerr shows pending/processing/available', () => {
    render(<Overseerr data={{ pending: 4, processing: 1, available: 200 }} />);
    expect(screen.getByText('Overseerr')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });
  it('Plex shows streams/libraries', () => {
    render(<Plex data={{ streams: 2, libraries: 5 }} />);
    expect(screen.getByText('Plex')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
  it('Qbittorrent shows counts and formatted speeds', () => {
    render(
      <Qbittorrent data={{ active: 3, downloading: 1, seeding: 2, downSpeed: 2 * 1024 * 1024, upSpeed: 50 * 1024 }} />,
    );
    expect(screen.getByText('qBittorrent')).toBeInTheDocument();
    expect(screen.getByText('2.0 MB/s')).toBeInTheDocument();
    expect(screen.getByText('50 KB/s')).toBeInTheDocument();
  });
});
