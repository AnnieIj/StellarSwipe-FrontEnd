export const REFERRAL_CHANNELS = [
  "twitter",
  "telegram",
  "whatsapp",
  "email",
  "copy",
] as const;

export type ReferralChannel = (typeof REFERRAL_CHANNELS)[number];

export const REFERRAL_MILESTONE_COUNTS = [1, 3, 5, 10] as const;

export interface ReferralRecord {
  verified: boolean;
}

export type ReferralCtaVariant = "sign_in" | "invite" | "share_progress" | "copy";

export interface ReferralCta {
  variant: ReferralCtaVariant;
  i18nKey: string;
}

export function isReferralChannel(value: unknown): value is ReferralChannel {
  return (
    typeof value === "string" &&
    (REFERRAL_CHANNELS as readonly string[]).includes(value)
  );
}

export function countVerifiedReferrals(
  referrals: ReadonlyArray<ReferralRecord>,
): number {
  return referrals.reduce(
    (total, referral) => (referral?.verified ? total + 1 : total),
    0,
  );
}

export function nextMilestone(count: number): number | null {
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  const next = REFERRAL_MILESTONE_COUNTS.find((milestone) => milestone > safeCount);
  return next ?? null;
}

export function reachedMilestone(count: number): number | null {
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  const reached = [...REFERRAL_MILESTONE_COUNTS]
    .reverse()
    .find((milestone) => milestone <= safeCount);
  return reached ?? null;
}

export function milestoneProgress(count: number): number {
  const next = nextMilestone(count);
  if (next === null) return 1;
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  return Math.min(1, Math.max(0, safeCount / next));
}

export function buildReferralLink(
  baseUrl: string,
  channel: ReferralChannel,
  code: string,
): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("utm_source", channel);
    url.searchParams.set("utm_medium", "referral");
    url.searchParams.set("ref", code);
    return url.toString();
  } catch {
    const hashIndex = baseUrl.indexOf("#");
    const base = hashIndex === -1 ? baseUrl : baseUrl.slice(0, hashIndex);
    const fragment = hashIndex === -1 ? "" : baseUrl.slice(hashIndex);
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}utm_source=${channel}&utm_medium=referral&ref=${code}${fragment}`;
  }
}

export function selectReferralCta(options: {
  count: number;
  isSignedIn: boolean;
  hasCopied: boolean;
}): ReferralCta {
  if (!options.isSignedIn) {
    return { variant: "sign_in", i18nKey: "referral.cta.sign_in" };
  }
  if (options.hasCopied) {
    return { variant: "copy", i18nKey: "referral.cta.copied" };
  }
  if (options.count <= 0) {
    return { variant: "invite", i18nKey: "referral.cta.invite" };
  }
  return { variant: "share_progress", i18nKey: "referral.cta.share_progress" };
}
