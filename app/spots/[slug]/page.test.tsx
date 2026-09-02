import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import SpotPage from "./page";
import { SPOTS_MOCK } from "@/lib/places/mocks";

describe("SpotPage", () => {
  it("calls notFound() for an unknown slug", async () => {
    await expect(
      SpotPage({ params: { slug: "does-not-exist" } })
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
  });

  it("renders the detail for a valid slug", async () => {
    const spot = SPOTS_MOCK[0];
    const { container } = render(await SpotPage({ params: { slug: spot.slug } }));
    expect(container.textContent).toContain(spot.nameEn);
  });
});
