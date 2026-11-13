
# Ma trận truy vết Task 1–2

> **Phạm vi đối chiếu:** mã nguồn đầy đủ được tham chiếu từ checkout BrewLite riêng (`D:\brewlite`). Repository `D:\brewlite-assignment2` hiện chỉ có API `products`; các test/module dưới đây không có sẵn trong repository Assignment 2 và không được xem là bằng chứng đã chạy tại đây.

| Requirement | Use Case | Sơ đồ | Code tham chiếu (BrewLite đầy đủ) | Test / bằng chứng |
|---|---|---|---|---|
| FR-01–FR-02 Menu/chi tiết | UC-01–UC-02 | `use-case.puml` | `apps/api/src/products`; `apps/web/src/app/products` | `products.controller.spec.ts`, `products.service.spec.ts`, `apps/web/src/app/products/[id]/page.test.tsx` |
| FR-03 Size/topping | UC-02 | `use-case.puml`, `activity.puml` | `apps/api/src/orders/dto`; `apps/web/src/lib/pricing.ts` | `create-order-item.dto.spec.ts`, `apps/web/src/lib/pricing.test.ts` |
| FR-04–FR-06 Giỏ/tổng tiền | UC-03 | `use-case.puml`, `activity.puml` | `apps/web/src/components/cart-provider.tsx`, `apps/web/src/app/cart` | `cart-provider.test.tsx`, `apps/web/src/app/cart/page.test.tsx`, `apps/web/src/lib/pricing.test.ts` |
| FR-07–FR-08 Đăng ký/đăng nhập JWT | UC-04–UC-05, UC-18 | `use-case.puml`, `sequence.puml` | `apps/api/src/auth`; `apps/web/src/components/auth-provider.tsx` | `auth.service.spec.ts`, `jwt-auth.guard.spec.ts`, `auth-provider.test.tsx` |
| FR-09 Tạo đơn | UC-06, UC-18 | `activity.puml`, `sequence.puml`, `class.puml` | `apps/api/src/orders/orders.service.ts`, `apps/api/src/orders/entities` | `orders.service.spec.ts`, `apps/web/src/app/checkout/page.test.tsx` |
| FR-10–FR-11 Phương thức/kết quả thanh toán | UC-07, UC-18 | `use-case-checkout.puml`, `activity.puml`, `sequence.puml` | `apps/api/src/payments` | `payments.service.spec.ts` |
| FR-12–FR-14 Xác nhận, lịch sử, trạng thái | UC-08–UC-10, UC-18 | `use-case.puml`, `activity.puml`, `sequence.puml` | `apps/api/src/orders/orders.controller.ts`, `apps/api/src/orders/order-state.ts` | `orders.service.spec.ts`, `order-state.spec.ts`, checkout page tests |
| FR-15 State Machine | UC-10 | `use-case.puml`, `class.puml` | `apps/api/src/orders/order-state.ts` | `order-state.spec.ts` |
| FR-16 Idempotency | UC-17, UC-18 | `use-case-checkout.puml`, `sequence.puml`, `class.puml` | `apps/api/src/payments/payments.service.ts`, `payment.entity.ts` | `payments.service.spec.ts` |
| FR-17 Tồn kho đồng thời | UC-16, UC-18 | `activity.puml`, `sequence.puml`, `class.puml` | `apps/api/src/ingredients/ingredients.service.ts`; reservation theo recipe/ingredient version | `ingredients.service.spec.ts`, `orders.service.spec.ts`; cần xác nhận có test concurrency đúng AC |
| FR-18 Khuyến mãi | UC-11, UC-18 | `use-case-checkout.puml`, `sequence.puml`, `class.puml` | `apps/api/src/promotions`, `apps/api/src/orders/orders.service.ts` | `orders.service.spec.ts`; cần đối chiếu độ phủ từng quy tắc promotion |
| FR-19 Loyalty | UC-12, UC-18 | `use-case.puml`, `sequence.puml`, `class.puml` | `UserEntity.loyaltyPoints`, `OrderEntity.redeemedPoints/loyaltyPointsAwarded`; không có ledger entity | `payments.service.spec.ts`, `orders.service.spec.ts`; `LoyaltyTransaction` chỉ là lớp domain khái niệm |
| FR-20 Giao diện nhân viên | UC-13 | `use-case.puml` | Staff routes/UI trong BrewLite đầy đủ | `staff.guard.spec.ts`, `staff-orders-panel.test.tsx`; phạm vi MVP cần nhóm chốt |
| FR-21 Quản trị menu | UC-14 | `use-case.puml` | Chưa thấy giao diện quản trị menu riêng | Chưa có test tham chiếu |
| FR-22 Thông báo chủ động | UC-15 | `use-case.puml` | Chưa thấy implementation | Chưa có test tham chiếu |
| FR-23–FR-24 Won't | — | — | Ngoài phạm vi bản bàn giao | Không áp dụng |
| NFR-01 Hiệu năng | Ngang hệ thống | — | Chưa có báo cáo benchmark được xác nhận | Cần lưu phép đo theo AC của SRS |
| NFR-02–NFR-04 Bảo mật, validate, lỗi | Ngang hệ thống | `sequence.puml` | Auth, DTO validation, ownership checks, UI | Auth/JWT tests; DTO tests; cần QA UI cho lỗi |
| NFR-05 Mobile-first/PWA | Ngang hệ thống | — | `apps/web` | Chưa có bằng chứng QA viewport/PWA đầy đủ |
| NFR-06–NFR-07 Công nghệ/local/migration | Ngang hệ thống | — | Next.js/NestJS/PostgreSQL, Compose, migrations | Cần kiểm chứng chạy sạch theo README |
| NFR-08 CI/test | Ngang hệ thống | — | CI workflow và test suites của BrewLite đầy đủ | Cần xác nhận log CI và test E2E theo AC |
| NFR-09 CD/production/secrets | Ngang hệ thống | `deployment.puml` | Deployment artifacts | Chưa xác minh URL/health/smoke/rollback |
| NFR-10 Truy vết/bàn giao | Toàn bộ UC | Các sơ đồ Task 1–2 | Tài liệu trong `docs/` | Ma trận này là khung truy vết; cần cập nhật trạng thái sau nghiệm thu |

Test path trong bảng là tham chiếu để kiểm tra, không khẳng định test đã chạy hoặc bao phủ hết acceptance criteria. Các cặp alias Task 2 có và không có hậu tố hiện được đồng bộ cùng nội dung.
