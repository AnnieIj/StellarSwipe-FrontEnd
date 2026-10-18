import React from 'react';
import { render, screen } from '@testing-library/react';
import TransactionTimeline from '../components/TransactionTimeline';
import type { TransactionLifecycleEvent } from '../lib/types/transaction';

describe('TransactionTimeline', () => {
  it('renders confirmed lifecycle events in chronological order with timestamps', () => {
    const events: TransactionLifecycleEvent[] = [
      {
        stage: 'confirmed',
        status: 'success',
        timestamp: '2024-05-01T10:03:00.000Z',
        description: 'Confirmed on ledger 12345',
      },
      {
        stage: 'submitted',
        status: 'success',
        timestamp: '2024-05-01T10:01:00.000Z',
        description: 'Submitted to network',
      },
      {
        stage: 'pending',
        status: 'success',
        timestamp: '2024-05-01T10:02:00.000Z',
        description: 'Awaiting ledger inclusion',
      },
    ];

    render(<TransactionTimeline events={events} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Submitted to network');
    expect(items[1]).toHaveTextContent('Awaiting ledger inclusion');
    expect(items[2]).toHaveTextContent('Confirmed on ledger 12345');

    expect(screen.getByText(/10:01/)).toBeInTheDocument();
    expect(screen.getByText(/10:02/)).toBeInTheDocument();
    expect(screen.getByText(/10:03/)).toBeInTheDocument();
  });

  it('visually distinguishes and describes failed stages', () => {
    const events: TransactionLifecycleEvent[] = [
      {
        stage: 'submitted',
        status: 'success',
        timestamp: '2024-05-01T10:01:00.000Z',
        description: 'Submitted to network',
      },
      {
        stage: 'failed',
        status: 'failed',
        timestamp: '2024-05-01T10:02:00.000Z',
        description: 'Transaction failed: insufficient balance',
      },
    ];

    render(<TransactionTimeline events={events} />);

    const failedItem = screen.getByText('Transaction failed: insufficient balance').closest('li');
    expect(failedItem).not.toBeNull();
    expect(failedItem).toHaveAttribute('data-status', 'failed');
    expect(failedItem).toHaveTextContent(/failed/i);
  });

  it('renders a useful receipt when only a final status is available', () => {
    const events: TransactionLifecycleEvent[] = [
      {
        stage: 'confirmed',
        status: 'success',
        timestamp: '2024-05-01T10:03:00.000Z',
        description: 'Confirmed on ledger 12345',
      },
    ];

    render(<TransactionTimeline events={events} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Confirmed on ledger 12345');
    expect(screen.getByText(/10:03/)).toBeInTheDocument();
  });

  it('renders a fallback message when no lifecycle events are available', () => {
    render(<TransactionTimeline events={[]} />);

    expect(screen.getByText(/no lifecycle events/i)).toBeInTheDocument();
  });
});
