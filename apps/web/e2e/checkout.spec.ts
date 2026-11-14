import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("orders a customized drink from the menu and verifies payment in history", async ({ page }) => {
  const email = `e2e-${randomUUID()}@example.invalid`;
  const password = `E2e1!${randomUUID()}`;
  const price = /40\.000\s*₫/;
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const main = page.getByRole("main");

  await test.step("Select a drink and check API options and cart price", async () => {
    await page.goto("/");
    const productResponse = page.waitForResponse(
      (response) => response.url() === "http://localhost:3081/products/1" &&
        response.request().method() === "GET",
    );
    await page.getByRole("link", { name: "Xem chi tiết Cà phê sữa" }).click();
    expect((await productResponse).status()).toBe(200);
    await expect(main.getByRole("heading", { name: "Cà phê sữa" })).toBeVisible();
    await expect(main.getByText(/25\.000\s*₫/, { exact: false })).toBeVisible();
    await expect(main.getByRole("radio")).toHaveCount(3);
    const size = main.getByRole("radio", { name: /Size L/ });
    await size.press("Space");
    await expect(size).toBeChecked();
    const topping = main.getByRole("checkbox", { name: /Trân châu/ });
    await topping.check();
    await main.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
    await page.getByRole("link", { name: "Giỏ hàng, 1 sản phẩm", exact: true }).click();

    const cart = main.getByRole("region", { name: "Các sản phẩm trong giỏ" });
    await expect(cart.getByRole("heading", { name: "Cà phê sữa" })).toBeVisible();
    await expect(cart.getByText("Size L", { exact: true })).toBeVisible();
    await expect(cart.getByRole("button", { name: "Bỏ topping Trân châu khỏi Cà phê sữa" })).toBeVisible();
    await expect(main.getByRole("complementary", { name: "Tổng kết đơn hàng" }))
      .toContainText(price);
  });

  await test.step("Register and sign in with a fresh customer account", async () => {
    await main.getByRole("link", { name: "Đăng nhập để đặt đơn" }).click();
    const register = main.getByRole("link", { name: "Đăng ký", exact: true });
    await expect(register).toHaveAttribute("href", "/register?returnTo=%2Fcart");
    await register.click();
    // The return link is updated by a client effect after the form is hydrated.
    await expect(main.getByRole("link", { name: "Đăng nhập", exact: true }))
      .toHaveAttribute("href", "/login?returnTo=%2Fcart");
    await main.getByLabel("Email", { exact: true }).fill(email);
    await main.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await main.getByLabel("Nhập lại mật khẩu", { exact: true }).fill(password);
    const [registrationResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url() === "http://localhost:3081/auth/register" &&
        response.request().method() === "POST",
      ),
      main.getByRole("button", { name: "Đăng ký", exact: true }).click(),
    ]);
    expect(registrationResponse.status()).toBe(201);
    await main.getByRole("link", { name: "Đi đến đăng nhập" }).click();
    await expect(main.getByRole("link", { name: "Đăng ký", exact: true }))
      .toHaveAttribute("href", "/register?returnTo=%2Fcart");
    await main.getByLabel("Email", { exact: true }).fill(email);
    await main.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await main.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(main.getByRole("heading", { name: "Cà phê sữa" })).toBeVisible();
  });

  const orderCode = await test.step("Create and pay for the order with the mock wallet", async () => {
    await main.getByRole("button", { name: "Tạo đơn hàng" }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    const order = main.getByRole("region", { name: "Thông tin đơn hàng" });
    const orderId = order.getByText(uuid);
    await expect(orderId).toBeVisible();
    const code = await orderId.innerText();
    await expect(order.getByText("PENDING", { exact: true })).toBeVisible();
    await expect(order).toContainText(price);
    const wallet = main.getByRole("radio", { name: /Ví điện tử/ });
    await wallet.press("Space");
    await expect(wallet).toBeChecked();
    await main.getByRole("button", { name: /Thanh toán 40\.000/ }).click();
    await main.getByRole("button", { name: "Xác nhận thanh toán mô phỏng" }).click();
    const confirmation = main.getByRole("status").filter({ hasText: "Thanh toán thành công" });
    await expect(confirmation.getByRole("heading", { name: "Thanh toán thành công" })).toBeVisible();
    await expect(confirmation).toContainText(code);
    await expect(confirmation).toContainText("PAID");
    await expect(confirmation).toContainText(price);
    return code;
  });

  await test.step("Confirm the same paid order appears in history", async () => {
    await main.getByRole("link", { name: "Lịch sử đơn hàng" }).click();
    await expect(page).toHaveURL(/\/orders$/);
    const entry = main.getByRole("region", { name: "Danh sách đơn hàng" })
      .getByRole("link", { name: new RegExp(orderCode) });
    await expect(entry).toHaveAttribute("href", `/orders/${orderCode}`);
    await expect(entry).toContainText(price);
    await entry.click();
    await expect(main.getByRole("heading", { name: /Chi tiết đơn hàng/ })).toBeVisible();
    await expect(main.getByText(orderCode, { exact: true })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Cà phê sữa" })).toBeVisible();
    await expect(main.getByText("PAID", { exact: true })).toBeVisible();
  });
});
