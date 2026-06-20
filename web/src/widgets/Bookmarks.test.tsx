import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Bookmarks } from './Bookmarks.tsx';

describe('Bookmarks', () => {
  it('renders each item as a link', () => {
    render(<Bookmarks data={{ items: [{ label: 'Sonarr', url: 'https://sonarr' }] }} />);
    const link = screen.getByRole('link', { name: 'Sonarr' });
    expect(link).toHaveAttribute('href', 'https://sonarr');
  });
});
