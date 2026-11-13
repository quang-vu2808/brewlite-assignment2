import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProductDetailPage from "./page";
const cart = vi.hoisted(() => ({ addItem: vi.fn(), hydrated: true }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "1" }) }));
vi.mock("../../../components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("../../../components/cart-provider", () => ({ useCart: () => cart }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe("Product detail", () => {
  it("uses API size/topping prices and keeps those options in the cart", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 1,
          name: "Bạc xỉu",
          price: 30000,
          image: "/images/products/bac-xiu.svg",
          options: {
            sizes: [
              { name: "S", surcharge: 0 },
              { name: "M", surcharge: 1234 },
              { name: "L", surcharge: 4321 },
            ],
            toppings: [{ id: "pearls", name: "Trân châu", surcharge: 987 }],
          },
        }),
      }),
    );
    render(<ProductDetailPage />);
    await screen.findByRole("heading", { name: "Bạc xỉu" });
    fireEvent.click(screen.getByRole("radio", { name: /Size L/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Trân châu/ }));
    expect(screen.getByText((text) => text.includes("35.308"))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Thêm vào giỏ hàng" }));
    expect(cart.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "1",
        size: "L",
        sizeSurcharge: 4321,
        toppings: [{ id: "pearls", name: "Trân châu", surcharge: 987 }],
      }),
    );
  });
  it("shows missing products and prevents adding them", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 404 }));
    render(<ProductDetailPage />);
    expect(
      await screen.findByRole("heading", { name: "Không tìm thấy sản phẩm" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Thêm vào giỏ hàng" }),
    ).toBeNull();
  });
});
