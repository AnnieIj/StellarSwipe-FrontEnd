import React from 'react';
import { render, screen } from '@testing-library/react';
import TransactionReceipt, {
  getExplorerTxUrl,
} from '../components/TransactionReceipt';

describe('getExplorerTxUrl', () => {
  const hash = 'abc123def456';

  it('builds a mainnet explorer link', () => {
    expect(getExplorerTxUrl(hash, 'mainnet')).toBe(
      `https://stellar.expert/explorer/public/tx/${hash}`,
    );
  });

  it('builds a testnet explorer link', () => {
    expect(getExplorerTxUrl(hash, 'testnet')).toBe(
      `https://stellar.expert/explorer/testnet/tx/${hash}`,
    );
  });

  it('returns null when the hash is missing', () => {
    expect(getExplorerTxUrl(undefined, 'mainnet')).toBeNull();
    expect(getExplorerTxUrl('', 'testnet')).toBeNull();
  });
});

describe('TransactionReceipt', () => {
  const complete = {
    hash: 'abc123def456',
    asset: 'XLM',
    amount: '10.5',
    time: '2024-01-01T12:00:00Z',
    status: 'success' as const,
    network: 'mainnet' as const,
  };

  it('renders all fields when available', () => {
    render(<TransactionReceipt transaction={complete} />);

    expect(screen.getByText('abc123def456')).toBeInTheDocument();
    expect(screen.getByText('XLM')).toBeInTheDocument();
    expect(screen.getByText('10.5')).toBeInTheDocument();
    expect(screen.getByText('success')).toBeInTheDocument();
  });

  it('renders a safe explorer link in a new tab', () => {
    render(<TransactionReceipt transaction={complete} />);

    const link = screen.getByRole('link', { name: /view on explorer/i });
    expect(link).toHaveAttribute(
      'href',
      'https://stellar.expert/explorer/public/tx/abc123def456',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('uses the testnet explorer link for testnet transactions', () => {
    render(
      <TransactionReceipt transaction={{ ...complete, network: 'testnet' }} />,
    );

    const link = screen.getByRole('link', { name: /view on explorer/i });
    expect(link).toHaveAttribute(
      'href',
      'https://stellar.expert/explorer/testnet/tx/abc123def456',
    );
  });

  it('labels missing fields as unavailable instead of misleading values', () => {
    render(
      <TransactionReceipt
        transaction={{ hash: 'abc123def456', network: 'mainnet' }}
      />,
    );

    expect(screen.getAllByText(/unavailable/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
  });

  it('omits the explorer link when the hash is missing', () => {
    render(<TransactionReceipt transaction={{ network: 'mainnet' }} />);

    expect(
      screen.queryByRole('link', { name: /view on explorer/i }),
    ).not.toBeInTheDocument();
  });
});
