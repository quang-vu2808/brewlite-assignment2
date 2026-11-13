import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OrdersClient } from "./orders-client";
vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("./site-header", () => ({ SiteHeader: () => null }));
vi.mock("./auth-provider", () => ({
  useAuth: () => ({ token: "token", logout: () => undefined }),
}));
vi.mock("./checkout-provider", async (original) => ({
  ...(await original<typeof import("./checkout-provider")>()),
  useCheckout: () => ({ setOrder: vi.fn() }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("loads the authenticated history endpoint and displays an empty state", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
  vi.stubGlobal("fetch", fetch);
  render(<OrdersClient />);
  expect(await screen.findByText("Bạn chưa có đơn hàng")).toBeTruthy();
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("/orders/me"),
    expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
  );
});
it("displays API errors instead of a fabricated order history", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: "Không tải được lịch sử" }),
      }),
  );
  render(<OrdersClient />);
  expect(await screen.findByRole("alert")).toBeTruthy();
});
