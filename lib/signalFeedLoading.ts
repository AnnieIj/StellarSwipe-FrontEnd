export const INITIAL_SKELETON_COUNT = 3;
export const SHIMMER_STAGGER_MS = 120;

export interface SignalFeedLoadingInput {
  itemCount: number;
  isInitialLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  viewportCount?: number;
}

export interface SignalFeedLoadingState {
  showInitialSkeletons: boolean;
  skeletonCount: number;
  showPaginationSkeleton: boolean;
  showEmptyState: boolean;
  ariaBusy: boolean;
}

export function buildShimmerDelays(
  count: number,
  stepMs: number = SHIMMER_STAGGER_MS,
): number[] {
  const safeCount = Math.max(0, Math.floor(count));
  const safeStep = Math.max(0, stepMs);
  const delays: number[] = [];
  for (let index = 0; index < safeCount; index += 1) {
    delays.push(index * safeStep);
  }
  return delays;
}

export function deriveSignalFeedLoading(
  input: SignalFeedLoadingInput,
): SignalFeedLoadingState {
  const hasItems = input.itemCount > 0;
  const showInitialSkeletons = input.isInitialLoading && !hasItems;
  const skeletonCount = showInitialSkeletons
    ? Math.max(1, Math.floor(input.viewportCount ?? INITIAL_SKELETON_COUNT))
    : 0;

  return {
    showInitialSkeletons,
    skeletonCount,
    showPaginationSkeleton:
      input.isFetchingNextPage && input.hasNextPage && hasItems,
    showEmptyState: !input.isInitialLoading && !input.isFetchingNextPage && !hasItems,
    ariaBusy: input.isInitialLoading || input.isFetchingNextPage,
  };
}
