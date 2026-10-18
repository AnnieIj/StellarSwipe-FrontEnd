"use client";

import { useMemo, useState } from "react";

interface ForumPost {
  id: string;
  provider: string;
  title: string;
  body: string;
  author: string;
  likes: number;
  pinned: boolean;
  comments: ForumComment[];
}

interface ForumComment {
  id: string;
  author: string;
  body: string;
}

const PROVIDERS = ["Alpha Signals", "Beta Trades", "Gamma Insights"];

const INITIAL_POSTS: ForumPost[] = [
  {
    id: "p1",
    provider: "Alpha Signals",
    title: "How do you size positions on Alpha Signals?",
    body: "I have been following Alpha Signals for a month. Curious how others size positions relative to account equity.",
    author: "trader_jane",
    likes: 4,
    pinned: true,
    comments: [
      { id: "c1", author: "mike_fx", body: "I risk 1% per signal and scale up only after a green week." },
    ],
  },
  {
    id: "p2",
    provider: "Beta Trades",
    title: "Beta Trades drawdown handling",
    body: "Anyone else notice Beta Trades pauses during high volatility? Sharing my experience here.",
    author: "quant_sam",
    likes: 2,
    pinned: false,
    comments: [],
  },
];

const REPUTATION: Record<string, number> = {
  trader_jane: 12,
  mike_fx: 7,
  quant_sam: 3,
};

export default function Page() {
  const [posts, setPosts] = useState<ForumPost[]>(INITIAL_POSTS);
  const [activeProvider, setActiveProvider] = useState<string>(PROVIDERS[0]);
  const [query, setQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const visiblePosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts
      .filter((p) => p.provider === activeProvider)
      .filter((p) =>
        q === ""
          ? true
          : p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q)
      )
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [posts, activeProvider, query]);

  function createPost() {
    if (!newTitle.trim() || !newBody.trim()) return;
    const post: ForumPost = {
      id: `p${Date.now()}`,
      provider: activeProvider,
      title: newTitle.trim(),
      body: newBody.trim(),
      author: "you",
      likes: 0,
      pinned: false,
      comments: [],
    };
    setPosts((prev) => [post, ...prev]);
    setNewTitle("");
    setNewBody("");
  }

  function addComment(postId: string) {
    const draft = (commentDrafts[postId] ?? "").trim();
    if (!draft) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                { id: `c${Date.now()}`, author: "you", body: draft },
              ],
            }
          : p
      )
    );
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
  }

  function likePost(postId: string) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    );
  }

  function togglePin(postId: string) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, pinned: !p.pinned } : p))
    );
  }

  function deletePost(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Community Forum</h1>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />
          Admin mode
        </label>
      </header>

      <nav className="mb-4 flex flex-wrap gap-2">
        {PROVIDERS.map((provider) => (
          <button
            key={provider}
            onClick={() => setActiveProvider(provider)}
            className={`rounded-full px-3 py-1 text-sm ${
              activeProvider === provider
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {provider}
          </button>
        ))}
      </nav>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search posts..."
        className="mb-6 w-full rounded border p-2"
      />

      <section className="mb-8 rounded border p-4">
        <h2 className="mb-2 font-semibold">Start a discussion</h2>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Title"
          className="mb-2 w-full rounded border p-2"
        />
        <textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder="Share your insight..."
          rows={4}
          className="mb-2 w-full rounded border p-2"
        />
        <button
          onClick={createPost}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Post
        </button>
      </section>

      <ul className="space-y-4">
        {visiblePosts.map((post) => (
          <li key={post.id} className="rounded border p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">
                {post.pinned && <span className="mr-1">📌</span>}
                {post.title}
              </h3>
              {isAdmin && (
                <div className="flex gap-2 text-xs">
                  <button onClick={() => togglePin(post.id)} className="underline">
                    {post.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button onClick={() => deletePost(post.id)} className="text-red-600 underline">
                    Delete
                  </button>
                </div>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-700">{post.body}</p>
            <p className="mt-2 text-xs text-gray-500">
              by {post.author} · reputation {REPUTATION[post.author] ?? 0}
            </p>
            <button
              onClick={() => likePost(post.id)}
              className="mt-2 rounded border px-2 py-1 text-sm"
            >
              👍 Helpful ({post.likes})
            </button>

            <div className="mt-3 space-y-2 border-t pt-3">
              {post.comments.map((c) => (
                <p key={c.id} className="text-sm">
                  <span className="font-medium">{c.author}</span>: {c.body}
                </p>
              ))}
              <div className="flex gap-2">
                <input
                  value={commentDrafts[post.id] ?? ""}
                  onChange={(e) =>
                    setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                  }
                  placeholder="Reply..."
                  className="flex-1 rounded border p-2 text-sm"
                />
                <button
                  onClick={() => addComment(post.id)}
                  className="rounded bg-gray-800 px-3 py-1 text-sm text-white"
                >
                  Reply
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
