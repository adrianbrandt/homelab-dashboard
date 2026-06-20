import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { Nav } from './Nav.tsx';

describe('Nav', () => {
  it('renders Overview and Containers links', () => {
    renderWithProviders(<Nav />, '/containers');
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Containers' })).toBeInTheDocument();
  });
});
