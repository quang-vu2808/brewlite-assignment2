import { describe, expect, it } from "vitest";
import { calculateUnitPrice } from "./pricing";
const SIZE_OPTIONS = [
  { name: "S", surcharge: 0 },
  { name: "M", surcharge: 5000 },
  { name: "L", surcharge: 10000 },
];
const TOPPING_OPTIONS = [
  { id: "pearls", name: "Trân châu", surcharge: 5000 },
  { id: "cheese-foam", name: "Kem cheese", surcharge: 10000 },
  { id: "espresso", name: "Shot espresso", surcharge: 8000 },
];

describe("calculateUnitPrice", () => {
  it.each(SIZE_OPTIONS)("adds the $name size surcharge", ({ surcharge }) => {
    expect(calculateUnitPrice(25000, surcharge, [])).toBe(25000 + surcharge);
  });

  it("adds multiple topping surcharges and counts a topping ID once", () => {
    const pearls = TOPPING_OPTIONS[0];
    const espresso = TOPPING_OPTIONS[2];

    expect(calculateUnitPrice(25000, 5000, [pearls, espresso, pearls])).toBe(
      43000,
    );
  });

  it("charges each portion when the topping supports multiple portions", () => {
    expect(
      calculateUnitPrice(25000, 0, [{ ...TOPPING_OPTIONS[0], quantity: 3 }]),
    ).toBe(40000);
  });

  it("does not produce invalid totals for invalid base prices or topping surcharges", () => {
    const invalidTopping = {
      id: "invalid",
      name: "Invalid",
      surcharge: Number.NaN,
    };

    expect(calculateUnitPrice(-1, 0, [invalidTopping])).toBe(0);
    expect(calculateUnitPrice(Number.MAX_SAFE_INTEGER, 10000, [])).toBe(0);
  });
});
