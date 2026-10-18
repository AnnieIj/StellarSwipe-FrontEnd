import {
  REFERRAL_CHANNELS,
  REFERRAL_MILESTONE_COUNTS,
  buildReferralLink,
  countVerifiedReferrals,
  isReferralChannel,
  milestoneProgress,
  nextMilestone,
  reachedMilestone,
  selectReferralCta,
} from "@/lib/referralCta";

describe("countVerifiedReferrals – only verified sign-ups count", () => {
  it("counts verified referrals", () => {
    expect(
      countVerifiedReferrals([
        { verified: true },
        { verified: false },
        { verified: true },
      ]),
    ).toBe(2);
  });

  it("handles an empty list", () => {
    expect(countVerifiedReferrals([])).toBe(0);
  });
});

describe("milestones – progress is always explainable", () => {
  it("points at the next milestone", () => {
    expect(nextMilestone(0)).toBe(REFERRAL_MILESTONE_COUNTS[0]);
    expect(nextMilestone(1)).toBe(REFERRAL_MILESTONE_COUNTS[1]);
    expect(nextMilestone(3)).toBe(REFERRAL_MILESTONE_COUNTS[2]);
  });

  it("has no next milestone once the last one is reached", () => {
    expect(nextMilestone(10)).toBeNull();
    expect(nextMilestone(99)).toBeNull();
  });

  it("reports the highest milestone already reached", () => {
    expect(reachedMilestone(0)).toBeNull();
    expect(reachedMilestone(2)).toBe(1);
    expect(reachedMilestone(7)).toBe(5);
  });

  it("clamps progress to the unit range", () => {
    expect(milestoneProgress(0)).toBe(0);
    expect(milestoneProgress(-5)).toBe(0);
    expect(milestoneProgress(10)).toBe(1);
    expect(milestoneProgress(50)).toBe(1);
  });

  it("grows towards the next milestone", () => {
    expect(milestoneProgress(1)).toBeCloseTo(1 / 3);
    expect(milestoneProgress(2)).toBeCloseTo(2 / 3);
  });

  it("treats a nonsense count as zero", () => {
    expect(nextMilestone(Number.NaN)).toBe(1);
    expect(reachedMilestone(Number.NaN)).toBeNull();
  });
});

describe("buildReferralLink – attribution survives the URL", () => {
  it("adds campaign parameters to a clean url", () => {
    const link = buildReferralLink("https://app.example/", "twitter", "CODE1");
    expect(link).toContain("utm_source=twitter");
    expect(link).toContain("utm_medium=referral");
    expect(link).toContain("ref=CODE1");
  });

  it("keeps parameters the page already had", () => {
    const link = buildReferralLink("https://app.example/?tab=signals", "email", "CODE1");
    expect(link).toContain("tab=signals");
    expect(link).toContain("utm_source=email");
  });

  it("keeps the fragment at the end", () => {
    const link = buildReferralLink("https://app.example/#referral", "copy", "CODE1");
    expect(link.endsWith("#referral")).toBe(true);
    expect(link).toContain("ref=CODE1");
  });

  it("escapes a code that needs it", () => {
    const link = buildReferralLink("https://app.example/", "copy", "a b&c");
    expect(link).toContain("ref=a+b%26c");
  });

  it("falls back to a plain string for a relative base", () => {
    const link = buildReferralLink("/app", "telegram", "CODE1");
    expect(link).toBe("/app?utm_source=telegram&utm_medium=referral&ref=CODE1");
  });

  it("keeps the fragment when falling back too", () => {
    expect(buildReferralLink("/app#top", "copy", "C")).toBe(
      "/app?utm_source=copy&utm_medium=referral&ref=C#top",
    );
  });

  it("uses & when the fallback already has a query", () => {
    expect(buildReferralLink("/app?a=1", "copy", "C")).toBe(
      "/app?a=1&utm_source=copy&utm_medium=referral&ref=C",
    );
  });
});

describe("selectReferralCta – one clear next step", () => {
  it("asks a signed-out visitor to sign in first", () => {
    expect(
      selectReferralCta({ count: 3, isSignedIn: false, hasCopied: false }),
    ).toEqual({ variant: "sign_in", i18nKey: "referral.cta.sign_in" });
  });

  it("invites the first referral when nobody has joined yet", () => {
    expect(
      selectReferralCta({ count: 0, isSignedIn: true, hasCopied: false }),
    ).toEqual({ variant: "invite", i18nKey: "referral.cta.invite" });
  });

  it("celebrates progress once referrals exist", () => {
    expect(
      selectReferralCta({ count: 2, isSignedIn: true, hasCopied: false }),
    ).toEqual({
      variant: "share_progress",
      i18nKey: "referral.cta.share_progress",
    });
  });

  it("confirms a copy instead of inviting again", () => {
    expect(
      selectReferralCta({ count: 0, isSignedIn: true, hasCopied: true }).variant,
    ).toBe("copy");
  });
});

describe("channels", () => {
  it("validates a channel before building a link", () => {
    expect(isReferralChannel("twitter")).toBe(true);
    expect(isReferralChannel("myspace")).toBe(false);
    expect(isReferralChannel(undefined)).toBe(false);
  });

  it("offers a fixed set of channels", () => {
    expect(REFERRAL_CHANNELS).toEqual([
      "twitter",
      "telegram",
      "whatsapp",
      "email",
      "copy",
    ]);
  });
});
