import { Suspense } from "react";
import { buildSignalPage } from "@/lib/signals";
import { BookmarksPage } from "@/components/bookmarks/BookmarksPage";

export default function BookmarksRoute() {
  const initialSignals = buildSignalPage(1, 50).items;

  return (
    <Suspense fallback={null}>
      <BookmarksPage initialSignals={initialSignals} />
    </Suspense>
  );
}
