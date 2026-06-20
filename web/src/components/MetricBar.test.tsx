import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricBar } from './MetricBar.tsx';

describe('MetricBar', () => {
  it('renders label and value text', () => {
    render(<MetricBar label="CPU" valueText="4%" percent={4} status="ok" />);
    expect(screen.getByText('CPU')).toBeInTheDocument();
    expect(screen.getByText('4%')).toBeInTheDocument();
  });

  it('sets fill width to the clamped percent', () => {
    render(<MetricBar label="RAM" valueText="x" percent={140} status="ok" />);
    expect(screen.getByTestId('fill').style.width).toBe('100%');
  });

  it('marks the fill warn when status is warn', () => {
    render(<MetricBar label="Disk" valueText="x" percent={90} status="warn" />);
    expect(screen.getByTestId('fill').className).toMatch(/warn/);
  });
});
