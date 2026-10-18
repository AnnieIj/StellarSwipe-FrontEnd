import React from 'react';

export type StellarNetwork = 'mainnet' | 'testnet';

export interface TransactionReceiptData {
  hash?: string | null;
  asset?: string | null;
  amount?: string | number | null;
  time?: string | Date | null;
  status?: string | null;
  network?: StellarNetwork | null;
}

export interface TransactionReceiptProps {
  transaction: TransactionReceiptData;
  network?: StellarNetwork;
}

const EXPLORER_BASE: Record<StellarNetwork, string> = {
  mainnet: 'https://stellar.expert/explorer/public/tx',
  testnet: 'https://stellar.expert/explorer/testnet/tx',
};

function resolveNetwork(
  explicit: StellarNetwork | undefined,
  fromTx: StellarNetwork | null | undefined,
): StellarNetwork {
  if (explicit === 'mainnet' || explicit === 'testnet') return explicit;
  if (fromTx === 'mainnet' || fromTx === 'testnet') return fromTx;
  return 'mainnet';
}

export function buildExplorerUrl(
  hash: string | null | undefined,
  network: StellarNetwork = 'mainnet',
): string | null {
  if (!hash || typeof hash !== 'string') return null;
  const trimmed = hash.trim();
  if (!trimmed) return null;
  const base = EXPLORER_BASE[network] ?? EXPLORER_BASE.mainnet;
  return `${base}/${encodeURIComponent(trimmed)}`;
}

function formatTime(time: string | Date | null | undefined): string | null {
  if (!time) return null;
  const date = time instanceof Date ? time : new Date(time);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatAmount(amount: string | number | null | undefined): string | null {
  if (amount === null || amount === undefined) return null;
  const str = String(amount).trim();
  return str ? str : null;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="receipt-field">
      <dt className="receipt-field__label">{label}</dt>
      <dd className="receipt-field__value">
        {value === null ? <span className="receipt-field__unavailable">Unavailable</span> : value}
      </dd>
    </div>
  );
}

export default function TransactionReceipt({ transaction, network }: TransactionReceiptProps) {
  const resolvedNetwork = resolveNetwork(network, transaction.network);
  const hash = transaction.hash && transaction.hash.trim() ? transaction.hash.trim() : null;
  const explorerUrl = buildExplorerUrl(hash, resolvedNetwork);
  const asset = transaction.asset && transaction.asset.trim() ? transaction.asset.trim() : null;
  const amount = formatAmount(transaction.amount);
  const time = formatTime(transaction.time);
  const status = transaction.status && transaction.status.trim() ? transaction.status.trim() : null;

  return (
    <section className="transaction-receipt" aria-label="Transaction receipt">
      <h2 className="transaction-receipt__title">Transaction receipt</h2>
      <dl className="transaction-receipt__fields">
        <Field label="Transaction hash" value={hash} />
        <Field label="Asset" value={asset} />
        <Field label="Amount" value={amount} />
        <Field label="Time" value={time} />
        <Field label="Status" value={status} />
      </dl>
      {explorerUrl ? (
        <a
          className="transaction-receipt__explorer-link"
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View on Stellar explorer ({resolvedNetwork})
        </a>
      ) : (
        <p className="transaction-receipt__explorer-unavailable">
          Explorer link unavailable
        </p>
      )}
    </section>
  );
}
