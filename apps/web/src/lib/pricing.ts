export type ProductSize = "S" | "M" | "L";
export type ProductTopping = {
  id: string;
  name: string;
  surcharge: number;
  quantity?: number;
};

export function calculateUnitPrice(
  basePrice: number,
  sizeSurcharge: number,
  toppings: readonly ProductTopping[],
): number {
  const safeBasePrice =
    Number.isSafeInteger(basePrice) && basePrice >= 0 ? basePrice : 0;
  const safeSizeSurcharge =
    Number.isSafeInteger(sizeSurcharge) && sizeSurcharge >= 0
      ? sizeSurcharge
      : 0;
  const uniqueToppings = new Map(
    toppings.map((topping) => [topping.id, topping]),
  );
  const toppingSurcharge = [...uniqueToppings.values()].reduce(
    (total, topping) =>
      total +
      (Number.isSafeInteger(topping.surcharge) && topping.surcharge > 0
        ? topping.surcharge
        : 0) *
        (Number.isSafeInteger(topping.quantity) && (topping.quantity ?? 0) > 0
          ? topping.quantity!
          : 1),
    0,
  );
  const total = safeBasePrice + safeSizeSurcharge + toppingSurcharge;

  return Number.isSafeInteger(total) ? total : 0;
}
