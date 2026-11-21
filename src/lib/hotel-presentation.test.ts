import { describe, expect, it } from "vitest";
import { compareHotelOrder, formatMzn, matchesQuickFilter, summarizeRooms } from "./hotel-presentation";

describe("hotel presentation rules", () => {
  it("uses the lowest actual room price and its capacity", () => {
    expect(summarizeRooms([
      { hotel_id: "a", price_per_night: 4200, capacity: 4, amenities: ["Piscina"] },
      { hotel_id: "a", price_per_night: 2100, capacity: 2, amenities: ["Pequeno-almoço"] },
    ])).toEqual({ price: 2100, capacity: 2, amenities: ["Piscina", "Pequeno-almoço"] });
  });
  it("does not invent prices for hotels without rooms", () => {
    expect(summarizeRooms([]).price).toBeNull();
  });
  it("formats prices in MZN", () => {
    expect(formatMzn(2100)).toContain("MZN");
    expect(formatMzn(2100)).not.toContain("R$");
  });
  it("sorts hotels with no price after priced hotels", () => {
    expect(compareHotelOrder({ price: 2100, rating: 3 }, { price: null, rating: 5 }, "price")).toBeLessThan(0);
  });
  it("filters by amenities rather than invented hotel attributes", () => {
    expect(matchesQuickFilter(["Piscina"], "pool")).toBe(true);
    expect(matchesQuickFilter(["Wi-Fi"], "pool")).toBe(false);
    expect(matchesQuickFilter(["Pequeno-almoço"], "breakfast")).toBe(true);
    expect(matchesQuickFilter(["Frente ao Mar"], "sea")).toBe(true);
  });
});