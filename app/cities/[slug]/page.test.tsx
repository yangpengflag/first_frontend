import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import CityPage from "./page";
import { CITIES_MOCK } from "@/lib/places/mocks";

describe("CityPage", () => {
  it("calls notFound() for an unknown slug", async () => {
    await expect(
      CityPage({ params: { slug: "does-not-exist" } })
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
  });

  it("renders the detail for a valid slug", async () => {
    const city = CITIES_MOCK[0];
    const { container } = render(await CityPage({ params: { slug: city.slug } }));
    expect(container.textContent).toContain(city.name);
  });
});
