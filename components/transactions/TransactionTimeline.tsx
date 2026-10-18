import React from 'react';
import type { TransactionLifecycleEvent } from '../../lib/types/transaction';

interface TransactionTimelineProps {
  events?: TransactionLifecycleEvent[];
  status?: string;
  className?: string;
}

const STAGE_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  pending: 'Pending',
  processing: 'Processing',
  confirmed: 'Confirmed',
  success: 'Confirmed',
  completed: 'Completed',
  failed: 'Failed',
  error: 'Failed',
  expired: 'Expired',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
};

const FAILED_STAGES = new Set(['failed', 'error', 'expired', 'cancelled', 'canceled']);
const UNRESOLVED_STAGES = new Set(['submitted', 'pending', 'processing']);

function normalizeStage(stage: string): string {
  return stage.trim().toLowerCase();
}

function stageLabel(stage: string): string {
  const key = normalizeStage(stage);
  return STAGE_LABELS[key] ?? stage;
}

function formatTimestamp(timestamp?: string | number | Date): string {
  if (timestamp === undefined || timestamp === null || timestamp === '') {
    return 'Time unavailable';
  }
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Time unavailable';
  }
  return date.toLocaleString();
}

function stageDescription(stage: string): string {
  const key = normalizeStage(stage);
  if (FAILED_STAGES.has(key)) {
    return 'This stage did not complete successfully.';
  }
  if (UNRESOLVED_STAGES.has(key)) {
    return 'This stage has not been resolved yet.';
  }
  return 'This stage completed successfully.';
}

function stageTone(stage: string): 'failed' | 'unresolved' | 'complete' {
  const key = normalizeStage(stage);
  if (FAILED_STAGES.has(key)) {
    return 'failed';
  }
  if (UNRESOLVED_STAGES.has(key)) {
    return 'unresolved';
  }
  return 'complete';
}

function sortChronologically(events: TransactionLifecycleEvent[]): TransactionLifecycleEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const aTime = a.event.timestamp ? new Date(a.event.timestamp).getTime() : NaN;
      const bTime = b.event.timestamp ? new Date(b.event.timestamp).getTime() : NaN;
      const aValid = !Number.isNaN(aTime);
      const bValid = !Number.isNaN(bTime);
      if (aValid && bValid && aTime !== bTime) {
        return aTime - bTime;
      }
      if (aValid !== bValid) {
        return aValid ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map(({ event }) => event);
}

const TONE_STYLES: Record<'failed' | 'unresolved' | 'complete', string> = {
  failed: 'border-red-500 bg-red-50 text-red-700',
  unresolved: 'border-amber-500 bg-amber-50 text-amber-700',
  complete: 'border-green-500 bg-green-50 text-green-700',
};

const TONE_DOT_STYLES: Record<'failed' | 'unresolved' | 'complete', string> = {
  failed: 'bg-red-500',
  unresolved: 'bg-amber-500',
  complete: 'bg-green-500',
};

export default function TransactionTimeline({ events, status, className }: TransactionTimelineProps) {
  const hasEvents = Array.isArray(events) && events.length > 0;

  if (!hasEvents) {
    if (!status) {
      return null;
    }
    const tone = stageTone(status);
    return (
      <section className={className} aria-label="Transaction lifecycle">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Transaction lifecycle</h3>
        <div className={`rounded-md border px-3 py-2 text-sm ${TONE_STYLES[tone]}`}>
          <p className="font-medium">{stageLabel(status)}</p>
          <p className="text-xs">{stageDescription(status)}</p>
        </div>
      </section>
    );
  }

  const ordered = sortChronologically(events);

  return (
    <section className={className} aria-label="Transaction lifecycle">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">Transaction lifecycle</h3>
      <ol className="space-y-3">
        {ordered.map((event, index) => {
          const tone = stageTone(event.stage);
          return (
            <li key={`${event.stage}-${index}`} className="flex gap-3">
              <span
                aria-hidden="true"
                className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${TONE_DOT_STYLES[tone]}`}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{stageLabel(event.stage)}</p>
                <p className="text-xs text-gray-500">{formatTimestamp(event.timestamp)}</p>
                <p className={`text-xs ${tone === 'failed' ? 'text-red-600' : tone === 'unresolved' ? 'text-amber-600' : 'text-gray-600'}`}>
                  {event.description ?? stageDescription(event.stage)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
