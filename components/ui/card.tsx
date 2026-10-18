import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card — a rounded surface container used to visually group related content.
 *
 * Renders a `<div>` with a border, background, and subtle shadow. Compose with
 * {@link CardHeader} and {@link CardContent} to build structured card layouts,
 * or supply arbitrary children directly.
 *
 * Accepts all standard `<div>` HTML attributes and forwards a ref.
 *
 * @example
 * <Card>
 *   <CardHeader>
 *     <h3>Signal: XLM/USDC</h3>
 *   </CardHeader>
 *   <CardContent>
 *     <p>Confidence: 82%</p>
 *   </CardContent>
 * </Card>
 *
 * @see {@link https://storybook.stellarswipe.dev/?path=/docs/ui-card--docs Storybook — Card}
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

/**
 * CardHeader — the top section of a {@link Card}, providing consistent
 * padding and a vertical flex layout for title / subtitle content.
 *
 * Accepts all standard `<div>` HTML attributes and forwards a ref.
 *
 * @example
 * <CardHeader>
 *   <h3 className="font-semibold">Portfolio Summary</h3>
 *   <p className="text-sm text-muted-foreground">Last updated 5 min ago</p>
 * </CardHeader>
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 p-5 pb-3", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

/**
 * CardContent — the body section of a {@link Card} with horizontal and bottom
 * padding. Place the primary content of the card here.
 *
 * Accepts all standard `<div>` HTML attributes and forwards a ref.
 *
 * @example
 * <CardContent>
 *   <dl className="space-y-1 text-sm">
 *     <div><dt>Entry</dt><dd>$0.4821</dd></div>
 *     <div><dt>Target</dt><dd>$0.55</dd></div>
 *   </dl>
 * </CardContent>
 */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-5 pb-5", className)} {...props} />
));
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardContent };
