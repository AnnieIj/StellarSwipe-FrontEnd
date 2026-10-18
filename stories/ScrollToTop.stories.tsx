import type { Meta, StoryObj } from "@storybook/react";
import { ScrollToTop } from "@/components/ScrollToTop";

const meta: Meta<typeof ScrollToTop> = {
  title: "UI/ScrollToTop",
  component: ScrollToTop,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Floating action button that appears once the user has scrolled past a threshold " +
          "and smoothly returns them to the top of the page. Drop it into any long-scroll " +
          "page layout — it manages its own scroll listener internally.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ScrollToTop>;

/**
 * Default story with a tall page. Scroll down to see the FAB appear.
 */
export const Default: Story = {
  decorators: [
    (Story) => (
      <div>
        <div className="p-8 space-y-4">
          <p className="text-muted-foreground text-sm">
            Scroll down past one viewport height to see the button appear.
          </p>
          {Array.from({ length: 40 }, (_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-muted/30 border flex items-center px-4 text-sm text-muted-foreground"
            >
              Row {i + 1}
            </div>
          ))}
        </div>
        <Story />
      </div>
    ),
  ],
};

/**
 * Always-visible variant for visual inspection — uses a threshold of 0.
 */
export const AlwaysVisible: Story = {
  args: {
    threshold: 0,
  },
  decorators: [
    (Story) => (
      <div className="p-8 h-64">
        <p className="text-muted-foreground text-sm">
          Threshold is 0 so the button is visible immediately.
        </p>
        <Story />
      </div>
    ),
  ],
};

/**
 * Hidden state — threshold is very large so the button never shows.
 */
export const Hidden: Story = {
  args: {
    threshold: 999999,
  },
  decorators: [
    (Story) => (
      <div className="p-8 h-64">
        <p className="text-muted-foreground text-sm">
          Threshold is unreachably large — button stays hidden.
        </p>
        <Story />
      </div>
    ),
  ],
  parameters: { chromatic: { disableSnapshot: true } },
};
