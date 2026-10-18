"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  useProviderProfile,
  useProviderSignals,
} from "@/hooks/useProviderProfile";
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  UserMinus,
  Inbox,
  MessageSquare,
  Pin,
  Search,
  ThumbsUp,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PageTransition } from "@/components/PageTransition";
import { UnfollowDialog } from "@/components/UnfollowDialog";
import { useUnfollowDialog } from "@/hooks/useUnfollowDialog";
import { useFollowedProvidersStore } from "@/store/useFollowedProvidersStore";
import { usePaginationClamp } from "@/hooks/usePaginationClamp";

const SIGNALS_PER_PAGE = 5;

interface ForumReply {
  id: string;
  author: string;
  body: string;
  likes: number;
  likedByMe: boolean;
}

interface ForumPost {
  id: string;
  title: string;
  body: string;
  author: string;
  reputation: number;
  pinned: boolean;
  likes: number;
  likedByMe: boolean;
  replies: ForumReply[];
}

const INITIAL_POSTS: ForumPost[] = [
  {
    id: "p1",
    title: "How do you size positions on this provider's signals?",
    body: "I've been following for a month and the win rate is solid, but I'm still unsure about position sizing. What works for you?",
    author: "0x9f...a12c",
    reputation: 42,
    pinned: true,
    likes: 12,
    likedByMe: false,
    replies: [
      {
        id: "r1",
        author: "0x3b...77de",
        body: "I scale in at 25% per signal and cap total exposure at 5% of my portfolio.",
        likes: 5,
        likedByMe: false,
      },
    ],
  },
  {
    id: "p2",
    title: "Anyone tracking this provider's drawdown periods?",
    body: "Curious whether the recent losing streak is within historical norms.",
    author: "0x1a...90ff",
    reputation: 18,
    pinned: false,
    likes: 4,
    likedByMe: false,
    replies: [],
  },
];

export default function ProviderProfilePage() {
  const router = useRouter();
  const params = useParams();
  const providerId = params?.providerId as string;

  const { data: provider, isLoading: providerLoading } =
    useProviderProfile(providerId);
  const { data: signals = [], isFetching: signalsFetching } =
    useProviderSignals(providerId);

  // Follow state is shared with the signal feed's "Followed" filter.
  // Feed signals identify their provider by name, so follows are keyed the same way.
  const followKey = provider?.name ?? provider?.address;
  const isFollowing = useFollowedProvidersStore(
    (s) => followKey !== undefined && s.followedProviders.includes(followKey)
  );
  const followProvider = useFollowedProvidersStore((s) => s.follow);
  const unfollowProvider = useFollowedProvidersStore((s) => s.unfollow);

  // Open positions copied from this provider — in a real app fetched from portfolio store
  const openCopiedPositions = signals.filter(
    (s) => s.outcome === "PENDING"
  ).length;

  const handleUnfollow = useCallback(() => {
    if (followKey) unfollowProvider(followKey);
  }, [followKey, unfollowProvider]);

  const { dialogState, requestUnfollow, handleConfirm, handleCancel } =
    useUnfollowDialog(handleUnfollow);

  // Keeps `page` valid as `signals` changes shape (new data, filtering,
  // etc.) instead of pointing at a page that no longer exists.
  const {
    page: currentPage,
    totalPages,
    offset,
    canGoPrevious,
    canGoNext,
    goToPrevious,
    goToNext,
  } = usePaginationClamp({
    totalItems: signals.length,
    pageSize: SIGNALS_PER_PAGE,
    resetKey: providerId,
  });
  const paginatedSignals = signals.slice(offset, offset + SIGNALS_PER_PAGE);

  // Community forum state — discussion threads scoped to this provider.
  const [posts, setPosts] = useState<ForumPost[]>(INITIAL_POSTS);
  const [forumSearch, setForumSearch] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  const handleCreatePost = useCallback(() => {
    const title = newTitle.trim();
    const body = newBody.trim();
    if (!title || !body) return;
    setPosts((prev) => [
      {
        id: `p${Date.now()}`,
        title,
        body,
        author: "You",
        reputation: 0,
        pinned: false,
        likes: 0,
        likedByMe: false,
        replies: [],
      },
      ...prev,
    ]);
    setNewTitle("");
    setNewBody("");
  }, [newTitle, newBody]);

  const handleLikePost = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              likes: post.likedByMe ? post.likes - 1 : post.likes + 1,
              likedByMe: !post.likedByMe,
            }
          : post
      )
    );
  }, []);

  const handleLikeReply = useCallback((postId: string, replyId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              replies: post.replies.map((reply) =>
                reply.id === replyId
                  ? {
                      ...reply,
                      likes: reply.likedByMe
                        ? reply.likes - 1
                        : reply.likes + 1,
                      likedByMe: !reply.likedByMe,
                    }
                  : reply
              ),
            }
          : post
      )
    );
  }, []);

  const handleAddReply = useCallback((postId: string) => {
    const body = (replyDrafts[postId] ?? "").trim();
    if (!body) return;
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              replies: [
                ...post.replies,
                {
                  id: `r${Date.now()}`,
                  author: "You",
                  body,
                  likes: 0,
                  likedByMe: false,
                },
              ],
            }
          : post
      )
    );
    setReplyDrafts((prev) => ({ ...prev, [postId]: "" }));
  }, [replyDrafts]);

  const handleTogglePin = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, pinned: !post.pinned } : post
      )
    );
  }, []);

  const query = forumSearch.trim().toLowerCase();
  const visiblePosts = posts
    .filter((post) =>
      query
        ? post.title.toLowerCase().includes(query) ||
          post.body.toLowerCase().includes(query)
        : true
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  if (providerLoading) {
    return (
      <PageTransition>
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </PageTransition>
    );
  }

  if (!provider) {
    return (
      <PageTransition>
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950">
          <p className="text-center text-red-500">Provider not found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950 w-full max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Go back to previous page"
        >
          <ArrowLeft size={16} className="rtl-flip" />
          Back
        </button>

        {/* Provider header */}
        <header className="rounded-lg border bg-card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              {provider.name && (
                <h1 className="text-2xl font-bold text-white mb-2">
                  {provider.name}
                </h1>
              )}
              <p className="text-sm text-muted-foreground font-mono">
                {provider.address.slice(0, 12)}...{provider.address.slice(-8)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Rank</p>
                <p className="text-3xl font-bold text-green-600">
                  #{provider.rank}
                </p>
              </div>
              {isFollowing ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() =>
                    requestUnfollow(
                      provider.name ?? provider.address,
                      openCopiedPositions
                    )
                  }
                  aria-label={`Unfollow ${provider.name ?? "this provider"}`}
                >
                  <UserMinus size={14} aria-hidden="true" />
                  Unfollow
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => followKey && followProvider(followKey)}
                  aria-label={`Follow ${provider.name ?? "this provider"}`}
                >
                  Follow
                </Button>
              )}
            </div>
          </div>

          {provider.bio && (
            <p className="text-sm text-foreground mb-6 leading-relaxed">
              {provider.bio}
            </p>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
              <p className="font-semibold text-green-600">
                {provider.winRate}%
              </p>
            </div>
            <div className="rounded bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Total Signals
              </p>
              <p className="font-semibold text-foreground">
                {provider.totalSignals}
              </p>
            </div>
            <div className="rounded bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Reputation</p>
              <p className="font-semibold text-blue-600">
                {provider.reputation}%
              </p>
            </div>
            <div className="rounded bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Trust Score</p>
              <p className="font-semibold text-purple-600">
                {provider.trustScore}%
              </p>
            </div>
          </div>
        </header>

        {/* Stake information */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Stake & Trust
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Staked Amount
              </p>
              <p className="text-2xl font-bold text-foreground">
                {provider.staked
                  ? `$${provider.staked.toLocaleString()}`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Trust Score</p>
              <p className="text-2xl font-bold text-purple-600">
                {provider.trustScore}%
              </p>
            </div>
          </div>
        </div>

        {/* Community forum */}
        <section
          id="forum"
          className="rounded-lg border bg-card p-6"
          aria-label="Community forum"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <MessageSquare size={18} aria-hidden="true" />
              Community Forum
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setIsAdmin((prev) => !prev)}
              aria-pressed={isAdmin}
              aria-label="Toggle moderation tools"
            >
              <Shield size={14} aria-hidden="true" />
              {isAdmin ? "Exit Moderation" : "Moderation"}
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={forumSearch}
              onChange={(e) => setForumSearch(e.target.value)}
              placeholder="Search discussions..."
              aria-label="Search forum posts"
              className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* New post composer */}
          <div className="mb-6 rounded-md border bg-muted/30 p-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Discussion title"
              aria-label="Discussion title"
              className="mb-2 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Share your insight... (supports **bold**, _italic_, `code`)"
              aria-label="Discussion body"
              rows={3}
              className="mb-2 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleCreatePost}
                disabled={!newTitle.trim() || !newBody.trim()}
              >
                Post Discussion
              </Button>
            </div>
          </div>

          {/* Threads */}
          {visiblePosts.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={<MessageSquare className="h-8 w-8 text-sky-400/80" />}
              title="No discussions found"
              description="Start the conversation by creating the first post."
            />
          ) : (
            <div className="space-y-4">
              {visiblePosts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-md border bg-background p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      {post.pinned && (
                        <Pin
                          size={14}
                          className="text-amber-500"
                          aria-label="Pinned discussion"
                        />
                      )}
                      {post.title}
                    </h3>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => handleTogglePin(post.id)}
                        aria-label={post.pinned ? "Unpin discussion" : "Pin discussion"}
                      >
                        <Pin size={12} aria-hidden="true" />
                        {post.pinned ? "Unpin" : "Pin"}
                      </Button>
                    )}
                  </div>
                  <p className="mb-3 whitespace-pre-wrap text-sm text-foreground/90">
                    {post.body}
                  </p>
                  <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{post.author}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      Rep {post.reputation}
                    </span>
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-1 transition-colors hover:text-foreground ${
                        post.likedByMe ? "text-blue-500" : ""
                      }`}
                      aria-pressed={post.likedByMe}
                      aria-label="Upvote post"
                    >
                      <ThumbsUp size={12} aria-hidden="true" />
                      {post.likes}
                    </button>
                  </div>

                  {/* Replies */}
                  {post.replies.length > 0 && (
                    <div className="mb-3 space-y-2 border-l-2 border-muted pl-3">
                      {post.replies.map((reply) => (
                        <div key={reply.id} className="text-sm">
                          <p className="text-foreground/90">{reply.body}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="font-mono">{reply.author}</span>
                            <button
                              onClick={() => handleLikeReply(post.id, reply.id)}
                              className={`flex items-center gap-1 transition-colors hover:text-foreground ${
                                reply.likedByMe ? "text-blue-500" : ""
                              }`}
                              aria-pressed={reply.likedByMe}
                              aria-label="Upvote reply"
                            >
                              <ThumbsUp size={12} aria-hidden="true" />
                              {reply.likes}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply composer */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyDrafts[post.id] ?? ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      placeholder="Write a reply..."
                      aria-label="Write a reply"
                      className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddReply(post.id)}
                      disabled={!(replyDrafts[post.id] ?? "").trim()}
                    >
                      Reply
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Recent signals */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Recent Signals
          </h2>

          {paginatedSignals.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={<Inbox className="h-8 w-8 text-sky-400/80" />}
              title="No signals available"
              description="This provider hasn't published any signals yet. Check back later."
            />
          ) : (
            <div className="space-y-3">
              {paginatedSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-md border bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {signal.direction === "LONG" ? (
                        <TrendingUp size={16} className="text-green-600" />
                      ) : (
                        <TrendingDown size={16} className="text-red-500" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {signal.asset}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {signal.outcome}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <PaginationControls
              className="mt-4"
              currentPage={currentPage}
              totalPages={totalPages}
              canGoPrevious={canGoPrevious}
              canGoNext={canGoNext}
              onPrevious={goToPrevious}
              onNext={goToNext}
              isFetching={signalsFetching}
            />
          )}
        </div>

        <UnfollowDialog
          open={dialogState.open}
          providerName={dialogState.providerName}
          openPositions={dialogState.openPositions}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </main>
    </PageTransition>
  );
}
