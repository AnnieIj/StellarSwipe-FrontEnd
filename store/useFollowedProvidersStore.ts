import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FollowedProvidersState {
  /** Provider names the user follows — matches `Signal.provider` in the feed */
  followedProviders: string[];
  follow: (name: string) => void;
  unfollow: (name: string) => void;
}

export const useFollowedProvidersStore = create<FollowedProvidersState>()(
  persist(
    (set) => ({
      followedProviders: [],
      follow: (name) =>
        set((state) => ({
          followedProviders: state.followedProviders.includes(name)
            ? state.followedProviders
            : [...state.followedProviders, name],
        })),
      unfollow: (name) =>
        set((state) => ({
          followedProviders: state.followedProviders.filter((p) => p !== name),
        })),
    }),
    {
      name: "followed-providers-store",
    }
  )
);
