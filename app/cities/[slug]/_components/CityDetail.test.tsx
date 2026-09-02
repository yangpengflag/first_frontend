import { render, screen } from "@testing-library/react";
import { beforeAll, describe, it, expect } from "vitest";
import type { Spot } from "@/lib/places/types";

import { CITIES_MOCK } from "@/lib/places/mocks";
import { getSpotsByCity } from "@/lib/places";
import { CityDetail } from "./CityDetail";

const related = [{ id: "p1", title: "Chengdu eats", slug: "chengdu-eats" }];

describe("CityDetail", () => {
  const city = CITIES_MOCK.find((c) => c.slug === "chengdu")!;
  let spots: Spot[] = [];
  beforeAll(async () => {
    spots = await getSpotsByCity(city.slug);
  });

  it("renders bilingual title, description and best season", () => {
    const { container } = render(
      <CityDetail city={city} spots={spots} related={related} />
    );
    expect(screen.getByRole("heading", { name: "Chengdu", level: 1 })).toBeInTheDocument();
    expect(container.textContent).toContain("成都");
    expect(container.textContent).toContain(city.description);
    expect(container.textContent).toContain(city.bestSeason ?? "");
  });

  it("renders subordinate spots grid", () => {
    render(<CityDetail city={city} spots={spots} related={related} />);
    expect(screen.getByText(/Spots in Chengdu/i)).toBeInTheDocument();
    expect(screen.getByText("Kuanzhai Alley")).toBeInTheDocument();
    expect(screen.getByText("Chengdu Panda Base")).toBeInTheDocument();
  });

  it("shows empty note when the city has no spots", () => {
    render(<CityDetail city={city} spots={[]} related={related} />);
    expect(screen.getByText(/该城市暂无收录景点/)).toBeInTheDocument();
  });
});
