/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComparisonGranularitySelector } from "../ComparisonGranularitySelector";
import { type ComparisonGranularity } from "@/lib/comparison";

describe("ComparisonGranularitySelector", () => {
  it("renders button with current granularity label", () => {
    const onChange = jest.fn();
    render(
      <ComparisonGranularitySelector
        value="month"
        onChange={onChange}
      />
    );
    expect(screen.getByText("Month-over-Month")).toBeInTheDocument();
  });

  it("opens dropdown when button is clicked", async () => {
    const onChange = jest.fn();
    render(
      <ComparisonGranularitySelector
        value="month"
        onChange={onChange}
      />
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText("Week-over-Week")).toBeInTheDocument();
    });
  });

  it("displays all granularity options when open", async () => {
    const onChange = jest.fn();
    render(
      <ComparisonGranularitySelector
        value="month"
        onChange={onChange}
      />
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Week-over-Week")).toBeInTheDocument();
      expect(screen.getByText("Month-over-Month")).toBeInTheDocument();
      expect(screen.getByText("Quarter-over-Quarter")).toBeInTheDocument();
      expect(screen.getByText("Year-over-Year")).toBeInTheDocument();
    });
  });

  it("calls onChange when option is selected", async () => {
    const onChange = jest.fn();
    render(
      <ComparisonGranularitySelector
        value="month"
        onChange={onChange}
      />
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      const weekOption = screen.getByText("Week-over-Week");
      fireEvent.click(weekOption);
    });

    expect(onChange).toHaveBeenCalledWith("week");
  });

  it("closes dropdown after selection", async () => {
    const onChange = jest.fn();
    const { container } = render(
      <ComparisonGranularitySelector
        value="month"
        onChange={onChange}
      />
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      const weekOption = screen.getByText("Week-over-Week");
      fireEvent.click(weekOption);
    });

    await waitFor(() => {
      const menu = container.querySelector('[role="menu"]');
      expect(menu).not.toBeInTheDocument();
    });
  });

  it("closes dropdown when Escape key is pressed", async () => {
    const onChange = jest.fn();
    const { container } = render(
      <ComparisonGranularitySelector
        value="month"
        onChange={onChange}
      />
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Week-over-Week")).toBeInTheDocument();
    });

    fireEvent.keyDown(button, { key: "Escape" });

    await waitFor(() => {
      const menu = container.querySelector('[role="menu"]');
      expect(menu).not.toBeInTheDocument();
    });
  });

  it("highlights current selection", async () => {
    const onChange = jest.fn();
    render(
      <ComparisonGranularitySelector
        value="month"
        onChange={onChange}
      />
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      const monthOption = screen.getByText("Month-over-Month");
      expect(monthOption.parentElement).toHaveClass("bg-sky-500/20");
    });
  });

  it("has proper aria attributes", () => {
    const onChange = jest.fn();
    render(
      <ComparisonGranularitySelector
        value="month"
        onChange={onChange}
      />
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("updates aria-expanded when dropdown opens", async () => {
    const onChange = jest.fn();
    render(
      <ComparisonGranularitySelector
        value="month"
        onChange={onChange}
      />
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute("aria-expanded", "true");
    });
  });

  it("closes dropdown when clicking outside", async () => {
    const onChange = jest.fn();
    const { container } = render(
      <div>
        <ComparisonGranularitySelector
          value="month"
          onChange={onChange}
        />
        <div data-testid="outside">Outside element</div>
      </div>
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Week-over-Week")).toBeInTheDocument();
    });

    const outside = screen.getByTestId("outside");
    fireEvent.mouseDown(outside);

    await waitFor(() => {
      const menu = container.querySelector('[role="menu"]');
      expect(menu).not.toBeInTheDocument();
    });
  });

  it("supports keyboard navigation with ArrowUp", async () => {
    const onChange = jest.fn();
    const { container } = render(
      <ComparisonGranularitySelector
        value="month"
        onChange={onChange}
      />
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Quarter-over-Quarter")).toBeInTheDocument();
    });

    const quarterOption = screen.getByText("Quarter-over-Quarter");
    fireEvent.keyDown(quarterOption, { key: "ArrowUp" });

    expect(onChange).toHaveBeenCalledWith("month");
  });

  it("supports keyboard navigation with ArrowDown", async () => {
    const onChange = jest.fn();
    const { container } = render(
      <ComparisonGranularitySelector
        value="month"
        onChange={onChange}
      />
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Month-over-Month")).toBeInTheDocument();
    });

    const monthOption = screen.getByText("Month-over-Month");
    fireEvent.keyDown(monthOption, { key: "ArrowDown" });

    expect(onChange).toHaveBeenCalledWith("quarter");
  });

  it("selects option with Enter key", async () => {
    const onChange = jest.fn();
    render(
      <ComparisonGranularitySelector
        value="month"
        onChange={onChange}
      />
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Week-over-Week")).toBeInTheDocument();
    });

    const weekOption = screen.getByText("Week-over-Week");
    fireEvent.keyDown(weekOption, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("week");
  });
});
