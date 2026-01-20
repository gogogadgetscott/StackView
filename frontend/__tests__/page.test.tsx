import { render, screen } from "@testing-library/react";
import Page from "../app/page";

// This test is a placeholder to verify the testing setup works
describe("Page Component", () => {
  it("renders the page title", () => {
    render(<Page />);

    expect(screen.getByText("Stacks & Containers")).toBeInTheDocument();
    expect(screen.getByText("StackView")).toBeInTheDocument();
  });

  it("displays the realtime stats badge", () => {
    render(<Page />);

    expect(screen.getByText(/Realtime stats via WebSocket/)).toBeInTheDocument();
  });
});
