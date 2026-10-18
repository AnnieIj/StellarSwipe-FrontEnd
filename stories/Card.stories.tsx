import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <h3 className="font-semibold text-lg">Card Title</h3>
        <p className="text-sm text-muted-foreground">Card subtitle</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Card body content goes here.</p>
      </CardContent>
    </Card>
  ),
};

export const WithData: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <h3 className="font-semibold text-lg">XLM / USDC</h3>
        <p className="text-sm text-muted-foreground">Signal details</p>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Entry Price</span>
          <span className="font-mono font-medium">$0.1234</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-muted-foreground">Target</span>
          <span className="font-mono font-medium text-green-500">$0.1500</span>
        </div>
      </CardContent>
    </Card>
  ),
};

export const Empty: Story = {
  render: () => (
    <Card className="w-80">
      <CardContent>
        <p className="text-sm text-muted-foreground text-center py-4">
          No content
        </p>
      </CardContent>
    </Card>
  ),
};
