'use client';

import { useMemo } from 'react';
import type { Transaction, TransactionStatus } from '@/lib/types/transaction';

interface TransactionReceiptProps {
  transaction: Transaction;
}

interface LifecycleEvent {
  status: TransactionStatus;
  timestamp?: string;
  label: string;
  description: string;
  tone: 'complete' | 'failed' | 'pending';
}

const STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: 'Submitted',
  processing: 'Processing',
  confirmed: 'Confirmed on ledger',
  failed: 'Failed',
  expired: 'Expired',
};

const STATUS_DESCRIPTIONS: Record<TransactionStatus, string> = {
  pending: 'Transaction submitted and awaiting network acknowledgement.',
  processing: 'Transaction accepted by the network and awaiting ledger confirmation.',
  confirmed: 'Transaction confirmed on the Stellar ledger.',
  failed: 'Transaction failed and was not applied to the ledger.',
  expired: 'Transaction expired before it could be confirmed.',
};

const STATUS_TONES: Record<TransactionStatus, LifecycleEvent['tone']> = {
  pending: 'pending',
  processing: 'pending',
  confirmed: 'complete',
  failed: 'failed',
  expired: 'failed',
};

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return 'Timestamp unavailable';
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Timestamp unavailable';
  }
  return date.toLocaleString();
}

function buildLifecycleEvents(transaction: Transaction): LifecycleEvent[] {
  const history = transaction.statusHistory ?? [];

  if (history.length === 0) {
    return [
      {
        status: transaction.status,
        timestamp: transaction.updatedAt ?? transaction.createdAt,
        label: STATUS_LABELS[transaction.status],
        description: STATUS_DESCRIPTIONS[transaction.status],
        tone: STATUS_TONES[transaction.status],
      },
    ];
  }

  return [...history]
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return aTime - bTime;
    })
    .map((entry) => ({
      status: entry.status,
      timestamp: entry.timestamp,
      label: STATUS_LABELS[entry.status],
      description: STATUS_DESCRIPTIONS[entry.status],
      tone: STATUS_TONES[entry.status],
    }));
}

const TONE_STYLES: Record<LifecycleEvent['tone'], string> = {
  complete: 'border-emerald-500 bg-emerald-500',
  failed: 'border-red-500 bg-red-500',
  pending: 'border-amber-500 bg-amber-500',
};

const TONE_TEXT_STYLES: Record<LifecycleEvent['tone'], string> = {
  complete: 'text-emerald-600',
  failed: 'text-red-600',
  pending: 'text-amber-600',
};

export default function TransactionReceipt({ transaction }: TransactionReceiptProps) {
  const events = useMemo(() => buildLifecycleEvents(transaction), [transaction]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Transaction Receipt</h2>
        <span className="font-mono text-xs text-gray-500">{transaction.id}</span>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-gray-500">Amount</dt>
          <dd className="font-medium text-gray-900">
            {transaction.amount} {transaction.asset}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Status</dt>
          <dd className={`font-medium ${TONE_TEXT_STYLES[STATUS_TONES[transaction.status]]}`}>
            {STATUS_LABELS[transaction.status]}
          </dd>
        </div>
      </dl>

      <h3 className="mb-3 text-sm font-semibold text-gray-900">Lifecycle</h3>
      <ol className="space-y-4">
        {events.map((event, index) => (
          <li key={`${event.status}-${event.timestamp ?? index}`} className="relative flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 h-3 w-3 rounded-full border-2 ${TONE_STYLES[event.tone]}`}
                aria-hidden="true"
              />
              {index < events.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-gray-200" aria-hidden="true" />
              )}
            </div>
            <div className="pb-2">
              <p className={`text-sm font-medium ${TONE_TEXT_STYLES[event.tone]}`}>
                {event.label}
              </p>
              <p className="text-xs text-gray-500">{formatTimestamp(event.timestamp)}</p>
              <p className="mt-1 text-xs text-gray-600">{event.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
