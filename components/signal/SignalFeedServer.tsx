import { buildSignalPage } from "@/lib/signals";
import { SignalFeed } from "@/components/signal/SignalFeed";
import { SignalFeedErrorBoundary } from "@/components/signal/SignalFeedErrorBoundary";

export async function SignalFeedServer() {
  const initialData = await buildSignalPage(1, 10);
  return (
    <SignalFeedErrorBoundary>
      <SignalFeed initialData={initialData} />
    </SignalFeedErrorBoundary>
  );
}
