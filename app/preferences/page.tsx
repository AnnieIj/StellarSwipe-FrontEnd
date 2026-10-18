import type { Metadata } from "next";
import { PreferencesHub } from "@/components/PreferencesHub";

export const metadata: Metadata = {
  title: "Preferences · StellarSwipe",
  description:
    "Manage theme, display density, currency, language, and notification preferences in one place.",
};

export default function PreferencesRoute() {
  return (
    <main aria-label="Preferences">
      <PreferencesHub />
    </main>
  );
}
