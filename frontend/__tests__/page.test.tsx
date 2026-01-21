import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Page from "../app/page";

// This test is a placeholder to verify the testing setup works
describe("Page Component", () => {
  it("renders the page title", () => {
    render(<Page />);

    expect(screen.getByText("Stacks & Containers")).toBeInTheDocument();
    expect(screen.getByText("StackView")).toBeInTheDocument();
  });

  it("displays the connected status pill", () => {
    render(<Page />);

    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("renders stacks and containers sections", () => {
    render(<Page />);

    expect(screen.getByText("Stacks")).toBeInTheDocument();
    expect(screen.getByText("All Containers")).toBeInTheDocument();
  });
});
