import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard — StellarSwipe",
  description:
    "Browse top-performing signal providers on StellarSwipe. Compare win rates, scores, and recent performance across daily, weekly, monthly, and all-time rankings.",
  openGraph: {
    title: "Leaderboard — StellarSwipe",
    description:
      "Browse top-performing signal providers on StellarSwipe. Compare win rates, scores, and recent performance across daily, weekly, monthly, and all-time rankings.",
    url: "/leaderboard",
  },
  twitter: {
    title: "Leaderboard — StellarSwipe",
    description:
      "Browse top-performing signal providers on StellarSwipe. Compare win rates, scores, and recent performance across daily, weekly, monthly, and all-time rankings.",
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
