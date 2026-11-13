import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "./page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("BrewLite menu", () => {
  it("shows products returned by the API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, name: "Cappuccino", price: 45000, image: "/images/products/cappuccino.svg" }],
    }));

    render(<Home />);

    expect(await screen.findByRole("heading", { name: "Cappuccino" })).toBeTruthy();
    expect(screen.getByText((text) => text.includes("45.000") && text.includes("₫"))).toBeTruthy();
    expect(screen.getByRole("img", { name: "Cappuccino" }).getAttribute("src")).toBe("/images/products/cappuccino.svg");
  });

  it("shows a loading state while the API request is pending", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    render(<Home />);

    expect(screen.getByRole("status", { name: "Đang tải sản phẩm" })).toBeTruthy();
  });

  it("shows an empty state when the API returns no products", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<Home />);

    expect(await screen.findByText("Hiện chưa có sản phẩm nào. Mời bạn quay lại sau.")).toBeTruthy();
  });

  it("shows an error and retries the API request", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 2, name: "Bạc xỉu", price: 30000 }] });
    vi.stubGlobal("fetch", fetchMock);

    render(<Home />);

    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Bạc xỉu" })).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
