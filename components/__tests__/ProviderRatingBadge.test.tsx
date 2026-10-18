/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { ProviderRatingBadge } from "@/components/ProviderRatingBadge";
import { useProviderProfile } from "@/hooks/useProviderProfile";

jest.mock("@/hooks/useProviderProfile");

const mockUseProviderProfile = useProviderProfile as jest.MockedFunction<
  typeof useProviderProfile
>;

const MOCK_PROFILE = {
  id: "provider-1",
  address: "GTEST",
  name: "AlphaTrader",
  overallScore: 94,
  winRate: 87,
  totalSignals: 256,
  recentPerformance: 12.5,
  rank: 1,
  bio: "Test trader",
  reputation: 95,
  staked: 50000,
  trustScore: 92,
};

function setupMock(profile = MOCK_PROFILE) {
  mockUseProviderProfile.mockReturnValue({
    data: profile,
    isLoading: false,
    error: null,
  } as any);
}

describe("ProviderRatingBadge – trust score breakdown popover", () => {
  beforeEach(() => {
    setupMock();
  });

  it("renders the badge trigger button", () => {
    render(<ProviderRatingBadge providerId="provider-1" />);
    const trigger = screen.getByRole("button", { name: /provider rating/i });
    expect(trigger).toBeTruthy();
  });

  it("popover is not visible before trigger is clicked", () => {
    render(<ProviderRatingBadge providerId="provider-1" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the breakdown popover when the trigger is clicked", () => {
    render(<ProviderRatingBadge providerId="provider-1" />);
    const trigger = screen.getByRole("button", { name: /provider rating/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("popover shows Trust Score Breakdown heading", () => {
    render(<ProviderRatingBadge providerId="provider-1" />);
    fireEvent.click(screen.getByRole("button", { name: /provider rating/i }));
    expect(screen.getByText(/Trust Score Breakdown/i)).toBeTruthy();
  });

  it("popover displays the provider name", () => {
    render(<ProviderRatingBadge providerId="provider-1" />);
    fireEvent.click(screen.getByRole("button", { name: /provider rating/i }));
    expect(screen.getByText(/AlphaTrader/)).toBeTruthy();
  });

  it("popover renders all expected breakdown factor labels", () => {
    render(<ProviderRatingBadge providerId="provider-1" />);
    fireEvent.click(screen.getByRole("button", { name: /provider rating/i }));

    expect(screen.getByText("Trust Score")).toBeTruthy();
    expect(screen.getByText("Win Rate")).toBeTruthy();
    expect(screen.getByText("Reputation")).toBeTruthy();
    expect(screen.getByText("Overall Score")).toBeTruthy();
  });

  it("popover displays the composite score", () => {
    render(<ProviderRatingBadge providerId="provider-1" />);
    fireEvent.click(screen.getByRole("button", { name: /provider rating/i }));
    expect(screen.getByText("Composite score")).toBeTruthy();
    expect(screen.getByText("92/100")).toBeTruthy();
  });

  it("popover displays total signals from profile data", () => {
    render(<ProviderRatingBadge providerId="provider-1" />);
    fireEvent.click(screen.getByRole("button", { name: /provider rating/i }));
    expect(screen.getByText("Total signals")).toBeTruthy();
    expect(screen.getByText("256")).toBeTruthy();
  });

  it("closes the popover when Escape is pressed", () => {
    render(<ProviderRatingBadge providerId="provider-1" />);
    fireEvent.click(screen.getByRole("button", { name: /provider rating/i }));
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the popover when the Close button is clicked", () => {
    render(<ProviderRatingBadge providerId="provider-1" />);
    fireEvent.click(screen.getByRole("button", { name: /provider rating/i }));
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("works with direct prop values when no providerId is given", () => {
    mockUseProviderProfile.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);
    render(
      <ProviderRatingBadge
        trustScore={75}
        winRate={80}
        providerName="BetaTrader"
      />
    );
    const trigger = screen.getByRole("button", { name: /provider rating/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/Trust Score Breakdown/i)).toBeTruthy();
  });

  it("trigger aria-expanded reflects popover open state", () => {
    render(<ProviderRatingBadge providerId="provider-1" />);
    const trigger = screen.getByRole("button", { name: /provider rating/i });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });
});
