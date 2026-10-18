import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { JournalCalendar } from '../src/components/JournalCalendar';

const entries = [
  { id: '1', date: '2024-01-15', symbol: 'AAPL', pnl: 120 },
  { id: '2', date: '2024-01-15', symbol: 'MSFT', pnl: -40 },
  { id: '3', date: '2024-01-31', symbol: 'TSLA', pnl: 75 },
  { id: '4', date: '2024-02-01', symbol: 'NVDA', pnl: 10 },
];

describe('JournalCalendar', () => {
  it('indicates days that have entries', () => {
    render(<JournalCalendar entries={entries} />);
    const day15 = screen.getByRole('button', { name: /January 15, 2024.*2 entries/i });
    expect(day15).toBeInTheDocument();
    expect(day15).toHaveAttribute('data-has-entries', 'true');
  });

  it('reveals the selected day entries', () => {
    render(<JournalCalendar entries={entries} />);
    fireEvent.click(screen.getByRole('button', { name: /January 15, 2024/i }));
    const list = screen.getByRole('list', { name: /entries for January 15, 2024/i });
    expect(within(list).getByText('AAPL')).toBeInTheDocument();
    expect(within(list).getByText('MSFT')).toBeInTheDocument();
  });

  it('navigates months with accessible names', () => {
    render(<JournalCalendar entries={entries} />);
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next month/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next month/i }));
    expect(screen.getByText(/February 2024/i)).toBeInTheDocument();
  });

  it('handles month boundaries', () => {
    render(<JournalCalendar entries={entries} />);
    fireEvent.click(screen.getByRole('button', { name: /next month/i }));
    expect(screen.getByRole('button', { name: /February 1, 2024.*1 entry/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /previous month/i }));
    expect(screen.getByRole('button', { name: /January 31, 2024.*1 entry/i })).toBeInTheDocument();
  });

  it('handles months with no entries', () => {
    render(<JournalCalendar entries={entries} />);
    fireEvent.click(screen.getByRole('button', { name: /next month/i }));
    fireEvent.click(screen.getByRole('button', { name: /next month/i }));
    expect(screen.getByText(/March 2024/i)).toBeInTheDocument();
    expect(screen.getByText(/no entries/i)).toBeInTheDocument();
  });
});
