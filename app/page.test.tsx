import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home page (smoke test)", () => {
  it("renders the WanderChina headline and tagline", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /WanderChina/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Discover China Like a Local/i)
    ).toBeInTheDocument();
  });
});
