import type { OrderToppingSnapshot } from "../orders/entities/order-item.entity";
export const SIZE_SURCHARGES = {
  S: 0,
  M: 5000,
  L: 10000,
} as const;

export const TOPPING_CATALOG: Record<string, OrderToppingSnapshot> = {
  pearls: { id: "pearls", name: "Trân châu", surcharge: 5000 },
  "cheese-foam": { id: "cheese-foam", name: "Kem cheese", surcharge: 10000 },
  espresso: { id: "espresso", name: "Shot espresso", surcharge: 8000 },
};

export const PRODUCT_OPTIONS = {
  sizes: Object.entries(SIZE_SURCHARGES).map(([name, surcharge]) => ({
    name,
    surcharge,
  })),
  toppings: Object.values(TOPPING_CATALOG),
};
