import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotAuthenticated } from './NotAuthenticated.tsx';

describe('NotAuthenticated', () => {
  it('shows the auth-required message', () => {
    render(<NotAuthenticated logoutUrl={null} />);
    expect(screen.getByText('Authentication required')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows a sign-in link when logoutUrl is set', () => {
    render(<NotAuthenticated logoutUrl="/cdn-cgi/access/logout" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/cdn-cgi/access/logout');
  });
});
