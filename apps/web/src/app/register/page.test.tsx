import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import RegisterPage from "./page";
vi.mock("../../components/site-header", () => ({ SiteHeader: () => null }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function fill(confirmation = "WrongPassword2026!") {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "user@example.invalid" },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "CoffeeSecure2026!" },
  });
  fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu"), {
    target: { value: confirmation },
  });
  fireEvent.click(screen.getByRole("button", { name: "Đăng ký" }));
}
it("rejects mismatched passwords before making a request", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<RegisterPage />);
  fill();
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Mật khẩu xác nhận không khớp.",
  );
  expect(fetch).not.toHaveBeenCalled();
});
it("displays duplicate email errors from the API", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ message: "Email đã được đăng ký" }),
      }),
  );
  render(<RegisterPage />);
  fill("CoffeeSecure2026!");
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Email đã được đăng ký",
  );
});
