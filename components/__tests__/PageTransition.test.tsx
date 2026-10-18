/** @jest-environment jsdom */
import { render } from "@testing-library/react";
import { PageTransition } from "@/components/PageTransition";

const motionProps: Record<string, unknown>[] = [];

jest.mock("framer-motion", () => ({
  useReducedMotion: () => true,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      motionProps.push(props);
      return <div>{children}</div>;
    },
  },
}));

describe("PageTransition", () => {
  it("uses opacity-only instant variants for reduced motion", () => {
    render(<PageTransition>Content</PageTransition>);
    expect(motionProps[0]).toMatchObject({
      variants: {
        hidden: { opacity: 0 },
        enter: { opacity: 1 },
        exit: { opacity: 0 },
      },
      transition: { duration: 0.01 },
    });
  });
});