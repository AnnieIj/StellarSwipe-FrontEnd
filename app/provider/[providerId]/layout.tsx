import type { Metadata } from "next";

type Props = {
  params: { providerId: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const providerId = params.providerId;

  return {
    title: `${providerId} — Provider Profile | StellarSwipe`,
    description: `View the profile, performance stats, win rate, and recent signals for signal provider ${providerId} on StellarSwipe.`,
    openGraph: {
      title: `${providerId} — Provider Profile | StellarSwipe`,
      description: `View the profile, performance stats, win rate, and recent signals for signal provider ${providerId} on StellarSwipe.`,
      url: `/provider/${providerId}`,
    },
    twitter: {
      title: `${providerId} — Provider Profile | StellarSwipe`,
      description: `View the profile, performance stats, win rate, and recent signals for signal provider ${providerId} on StellarSwipe.`,
    },
  };
}

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
