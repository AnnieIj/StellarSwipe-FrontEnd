import {
  INITIAL_SKELETON_COUNT,
  SHIMMER_STAGGER_MS,
  buildShimmerDelays,
  deriveSignalFeedLoading,
  type SignalFeedLoadingInput,
} from "@/lib/signalFeedLoading";

function input(
  overrides: Partial<SignalFeedLoadingInput> = {},
): SignalFeedLoadingInput {
  return {
    itemCount: 0,
    isInitialLoading: true,
    isFetchingNextPage: false,
    hasNextPage: true,
    ...overrides,
  };
}

describe("deriveSignalFeedLoading – placeholders match what the feed is doing", () => {
  it("fills the viewport with skeletons on the first load", () => {
    const state = deriveSignalFeedLoading(input());
    expect(state.showInitialSkeletons).toBe(true);
    expect(state.skeletonCount).toBe(INITIAL_SKELETON_COUNT);
    expect(state.ariaBusy).toBe(true);
  });

  it("keeps the layout stable with a custom viewport height", () => {
    expect(deriveSignalFeedLoading(input({ viewportCount: 5 })).skeletonCount).toBe(
      5,
    );
  });

  it("never renders zero skeletons while loading", () => {
    expect(deriveSignalFeedLoading(input({ viewportCount: 0 })).skeletonCount).toBe(
      1,
    );
  });

  it("hides skeletons once signals exist so the feed does not flash", () => {
    const state = deriveSignalFeedLoading(input({ itemCount: 4, isInitialLoading: false }));
    expect(state.showInitialSkeletons).toBe(false);
    expect(state.skeletonCount).toBe(0);
    expect(state.showEmptyState).toBe(false);
  });

  it("shows a trailing skeleton only while paging with more pages available", () => {
    expect(
      deriveSignalFeedLoading(
        input({ itemCount: 4, isInitialLoading: false, isFetchingNextPage: true }),
      ).showPaginationSkeleton,
    ).toBe(true);
  });

  it("does not show a trailing skeleton on the last page", () => {
    expect(
      deriveSignalFeedLoading(
        input({
          itemCount: 4,
          isInitialLoading: false,
          isFetchingNextPage: true,
          hasNextPage: false,
        }),
      ).showPaginationSkeleton,
    ).toBe(false);
  });

  it("shows the empty state only once loading has finished with no signals", () => {
    expect(deriveSignalFeedLoading(input({ isInitialLoading: false })).showEmptyState).toBe(
      true,
    );
    expect(
      deriveSignalFeedLoading(
        input({ isInitialLoading: false, isFetchingNextPage: true }),
      ).showEmptyState,
    ).toBe(false);
  });

  it("stays busy while either request is in flight", () => {
    expect(
      deriveSignalFeedLoading(
        input({ itemCount: 4, isInitialLoading: false, isFetchingNextPage: true }),
      ).ariaBusy,
    ).toBe(true);
    expect(
      deriveSignalFeedLoading(
        input({ itemCount: 4, isInitialLoading: false, isFetchingNextPage: false }),
      ).ariaBusy,
    ).toBe(false);
  });
});

describe("buildShimmerDelays – subtle, staggered motion", () => {
  it("staggers each placeholder by a fixed step", () => {
    expect(buildShimmerDelays(3)).toEqual([0, SHIMMER_STAGGER_MS, SHIMMER_STAGGER_MS * 2]);
  });

  it("honours a custom step", () => {
    expect(buildShimmerDelays(2, 50)).toEqual([0, 50]);
  });

  it("returns an empty list for a non-positive count", () => {
    expect(buildShimmerDelays(0)).toEqual([]);
    expect(buildShimmerDelays(-3)).toEqual([]);
  });

  it("never produces a negative delay", () => {
    expect(buildShimmerDelays(2, -100)).toEqual([0, 0]);
  });
});
