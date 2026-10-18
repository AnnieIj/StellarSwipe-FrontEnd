import type { Meta, StoryObj } from "@storybook/react";
import { CircleAlert, Database, SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof EmptyState> = {
  title: "UI/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const NoData: Story = {
  render: () => (
    <EmptyState
      title="No data yet"
      description="Connect your wallet to load your account information."
      icon={<Database className="h-8 w-8 text-sky-400/80" />}
      action={<Button size="sm">Connect wallet</Button>}
    />
  ),
};

export const NoResults: Story = {
  render: () => (
    <EmptyState
      title="No results"
      description="Try a broader filter or clear the search query."
      icon={<SearchX className="h-8 w-8 text-sky-400/80" />}
      action={
        <Button size="sm" variant="outline">
          Clear filters
        </Button>
      }
    />
  ),
};

export const ErrorAdjacent: Story = {
  render: () => (
    <EmptyState
      title="Nothing to show right now"
      description="We could not load the latest entries. Try refreshing."
      icon={<CircleAlert className="h-8 w-8 text-amber-400" />}
      action={<Button size="sm">Retry</Button>}
      secondaryAction={
        <Button size="sm" variant="outline">
          View status page
        </Button>
      }
    />
  ),
};
