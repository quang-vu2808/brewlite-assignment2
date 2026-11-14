import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CartPage from "./page";
const state = vi.hoisted(() => ({
  push: vi.fn(),
  setOrder: vi.fn(),
  logout: vi.fn(),
  token: "jwt",
  items: [
    {
      key: "one",
      productId: "1",
      name: "Cà phê sữa",
      image: null,
      size: "M",
      toppings: [{ id: "pearls", name: "Trân châu", surcharge: 5000 }],
      unitPrice: 1,
      quantity: 2,
    },
  ],
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock("../../components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("../../components/auth-provider", () => ({
  useAuth: () => ({
    token: state.token,
    user: state.token ? { id: "u" } : null,
    logout: state.logout,
  }),
}));
vi.mock("../../components/cart-provider", () => ({
  useCart: () => ({
    items: state.items,
    hydrated: true,
    totalItems: 2,
    totalPrice: 2,
    increaseQuantity: vi.fn(),
    decreaseQuantity: vi.fn(),
    removeTopping: vi.fn(),
    removeItem: vi.fn(),
  }),
}));
vi.mock("../../components/checkout-provider", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../components/checkout-provider")
  >()),
  useCheckout: () => ({ setOrder: state.setOrder }),
}));
beforeEach(() => {
  state.token = "jwt";
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe("Create order from cart", () => {
  it("sends only IDs/options/quantities and accepts the authoritative server total", async () => {
    const order = {
      id: "o",
      orderCode: "o",
      status: "PENDING",
      totalAmount: 70000,
      createdAt: "2026-01-01",
      items: [],
    };
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => order });
    vi.stubGlobal("fetch", fetch);
    render(<CartPage />);
    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn hàng" }));
    await waitFor(() => expect(state.push).toHaveBeenCalledWith("/checkout"));
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toEqual({
      items: [
        {
          productId: 1,
          size: "M",
          toppings: ["pearls"],
          toppingQuantities: [{ id: "pearls", quantity: 1 }],
          quantity: 2,
        },
      ],
    });
    expect(state.setOrder).toHaveBeenCalledWith(order);
  });
  it("prevents duplicate requests and keeps the cart when the API rejects a product", async () => {
    let resolve!: (value: unknown) => void;
    const fetch = vi.fn(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    render(<CartPage />);
    const button = screen.getByRole("button", { name: "Tạo đơn hàng" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fetch).toHaveBeenCalledTimes(1);
    resolve({
      ok: false,
      status: 404,
      json: async () => ({ message: "Không tìm thấy sản phẩm" }),
    });
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Không tìm thấy sản phẩm",
    );
    expect(state.push).not.toHaveBeenCalled();
    expect(state.items).toHaveLength(1);
  });
  it("requires login while preserving the cart", () => {
    state.token = "";
    render(<CartPage />);
    expect(
      screen
        .getByRole("link", { name: "Đăng nhập để đặt đơn" })
        .getAttribute("href"),
    ).toContain("/login?returnTo=");
    expect(screen.queryByRole("button", { name: "Tạo đơn hàng" })).toBeNull();
  });
});
