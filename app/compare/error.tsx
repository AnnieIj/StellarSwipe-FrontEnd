'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CompareError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const buildSupportDetails = () => {
    const lines = [
      'Compare route error report',
      `Route: /compare`,
      `Message: ${error.message || 'Unknown error'}`,
      `Digest: ${error.digest ?? 'n/a'}`,
      `Time: ${new Date().toISOString()}`,
      `User agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a'}`,
    ];
    return lines.join('\n');
  };

  const handleCopySupportDetails = async () => {
    try {
      await navigator.clipboard.writeText(buildSupportDetails());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        We couldn&apos;t load the compare view. You can try again, or contact
        support with the details below if the problem keeps happening.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={handleCopySupportDetails}
          aria-label="Copy support details to report this error"
          className="rounded-md border px-4 py-2 text-sm font-medium"
        >
          {copied ? 'Support details copied' : 'Copy support details'}
        </button>
        <Link
          href="/"
          className="rounded-md border px-4 py-2 text-sm font-medium"
        >
          Back to home
        </Link>
      </div>
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {copied
          ? 'Support details copied to clipboard.'
          : 'Support details include the route, error message, and timestamp only.'}
      </p>
    </div>
  );
}
