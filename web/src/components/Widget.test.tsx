import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Widget } from './Widget.tsx';

vi.mock('../widgets/registry.ts', () => ({
  widgetRegistry: new Map([['demo', ({ data }: { data: { label: string } }) => <span>{data.label}</span>]]),
}));

const mockUseWidget = vi.fn();
vi.mock('../hooks/useWidget.ts', () => ({ useWidget: (id: string, enabled?: boolean) => mockUseWidget(id, enabled) }));

describe('Widget host', () => {
  it('renders the component on an ok result', () => {
    mockUseWidget.mockReturnValue({ data: { ok: true, data: { label: 'hi' } }, isPending: false, isError: false });
    render(<Widget id="0-0" type="demo" />);
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  it('renders an error tile on a failed result', () => {
    mockUseWidget.mockReturnValue({ data: { ok: false, error: 'timeout after 8s' }, isPending: false, isError: false });
    render(<Widget id="0-0" type="demo" />);
    expect(screen.getByText(/timeout after 8s/)).toBeInTheDocument();
  });
});
