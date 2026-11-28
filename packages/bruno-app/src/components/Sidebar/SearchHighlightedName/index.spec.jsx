import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import SearchHighlightedName from './index';

describe('SearchHighlightedName', () => {
  it('bolds every match and keeps the original casing', () => {
    const { container } = render(<span><SearchHighlightedName name="Refund and REFUND" searchText="refund" /></span>);
    const matches = screen.getAllByTestId('sidebar-search-match');
    expect(matches.map((m) => m.textContent)).toEqual(['Refund', 'REFUND']);
    expect(container).toHaveTextContent('Refund and REFUND');
  });

  it('renders plain text when there is no match or no query', () => {
    const { container, rerender } = render(<span><SearchHighlightedName name="Orders" searchText="zzz" /></span>);
    expect(container.innerHTML).toBe('<span>Orders</span>');
    rerender(<span><SearchHighlightedName name="Orders" searchText="" /></span>);
    expect(container.innerHTML).toBe('<span>Orders</span>');
  });
});
