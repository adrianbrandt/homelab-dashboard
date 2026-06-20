import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sparkline } from './Sparkline.tsx';
import type { SeriesPoint } from '@dashboard/shared';

const pts = (vals: (number | null)[]): SeriesPoint[] => vals.map((v, i) => ({ t: i, v }));

describe('Sparkline', () => {
  it('shows "no data" with fewer than two real points', () => {
    render(<Sparkline points={pts([5])} />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('renders a polyline and the current value', () => {
    const { container } = render(<Sparkline points={pts([1, 5, 3])} formatValue={(v) => `${v}u`} />);
    expect(container.querySelector('polyline')).toBeTruthy();
    expect(screen.getByText('3u')).toBeInTheDocument(); // last real point
  });

  it('breaks the line into multiple polylines across a null gap', () => {
    const { container } = render(<Sparkline points={pts([1, 2, null, 4, 5])} />);
    expect(container.querySelectorAll('polyline').length).toBe(2);
  });
});
