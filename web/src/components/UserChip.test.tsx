import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserChip } from './UserChip.tsx';

describe('UserChip', () => {
  it('shows the user and a logout link when logoutUrl is set', () => {
    render(<UserChip user="me@example.com" logoutUrl="/cdn-cgi/access/logout" />);
    expect(screen.getByText('me@example.com')).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/cdn-cgi/access/logout');
  });

  it('renders without a link when logoutUrl is null', () => {
    render(<UserChip user="me@example.com" logoutUrl={null} />);
    expect(screen.getByText('me@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
