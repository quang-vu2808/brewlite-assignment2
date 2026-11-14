# BrewLite Assignment 2 — Nghiệm thu Task 5.2

Ngày kiểm tra: 14/11/2026. Branch: `feature/task-5.2-integration`. Phạm vi gồm kiểm thử nghiệp vụ, PostgreSQL integration, Chromium E2E, tái tạo schema, Docker Compose local và health endpoint.

## Môi trường

| Môi trường | Cấu hình |
|---|---|
| API integration | Jest + Supertest, `AppModule` thật, TypeORM và PostgreSQL 17. `compose.test-db.yml` dùng project `brewlite-assignment2-integration`, DB `brewlite_assignment2_test` và cổng `127.0.0.1:55432`. Jest cố định đích test và yêu cầu `TEST_DB_PASSWORD` trước khi nạp app. |
| Full-stack local | `docker-compose.yml` dùng project `brewlite-assignment2-stack` và volume `brewlite-assignment2-stack_pgdata`. Web tại `localhost:3080`, API tại `localhost:3081`, PostgreSQL nội bộ tại `db:5432`. Web nhận URL API lúc build, API cho phép origin của Web qua CORS. |
| Browser E2E | Playwright dùng Chromium qua Google Chrome trên Windows. Mỗi lượt tạo browser context, email và mật khẩu mới. Request đi qua Web và API thật, thanh toán đi qua Mock Payment Provider của ứng dụng. |

## Bao phủ yêu cầu

| Tiêu chí | Bằng chứng |
|---|---|
| Unit tests nghiệp vụ | **PASS**. 60 API tests gồm Auth/JWT, DTO, Products, giá và trạng thái đơn, payment, idempotency và health. 38 Web tests cho component, provider, giá, giỏ và checkout. |
| Integration tạo đơn và thanh toán | **PASS**. 15 tests trên PostgreSQL thật, gồm register/login/JWT, giá backend, validation, ownership, lưu order/payment, thất bại và thử lại, idempotency, đồng thời, CHECK, khóa ngoại, unique index và rollback. |
| E2E Menu đến xác nhận | **PASS**. Hai lượt liên tiếp từ Menu đến xác nhận và mở lại đúng mã đơn trong lịch sử sau khi chờ form đăng ký khởi tạo. |
| Migration và dữ liệu demo | **PASS**. Giai đoạn 3 đã áp dụng đủ bốn migration trên volume full-stack mới. Lượt nghiệm thu này kiểm tra lại lịch sử migration trên volume hiện có. Menu nằm trong catalog backend, dữ liệu khách hàng và đơn demo được tạo qua luồng đăng ký và đặt hàng mô phỏng. |
| Compose Web, API, PostgreSQL | **PASS**. Hai image đã build và ba service đạt `healthy` ở Giai đoạn 3. Kết quả kiểm tra lại stack ghi bên dưới. |
| GET /health | **PASS**. Endpoint public trả 200 khi PostgreSQL trả lời `SELECT 1`. Unit tests xác nhận 503 khi DB lỗi hoặc quá thời hạn chờ, không trả chi tiết kết nối. Tình huống 503 trên Docker khi ngắt DB chưa kiểm tra trực tiếp. |

## Lệnh kiểm tra

| Thư mục | Lệnh | Kết quả |
|---|---|---|
| `apps/api` | `npm run lint` | PASS |
| `apps/api` | `npm test -- --runInBand` | 60 PASS, 0 FAIL, 10 suite |
| `apps/api` | `npm run test:integration` | 15 PASS, 0 FAIL, 2 suite, trên cổng 55432 |
| `apps/api` | `npm run build` | PASS |
| `apps/api` | `npm audit --omit=dev` | 0 lỗ hổng được báo tại thời điểm kiểm tra |
| `apps/web` | `npm run lint` | PASS |
| `apps/web` | `npm test -- --run` | 38 PASS, 0 FAIL, 11 file |
| `apps/web` | `npm run build` | PASS ngoài sandbox Windows |
| Gốc repo | `docker compose --env-file .env.stack -p brewlite-assignment2-stack config --quiet` | PASS |

Đặt `TEST_DB_PASSWORD` trong terminal trước khi chạy integration. Log lỗi constraint trong test rollback là có chủ đích. Audit runtime ở bảng chỉ bao phủ dependency npm của API. Dùng README để xem cấu hình env, lệnh khởi động, lệnh Playwright Windows và cách dừng stack bằng `docker compose stop`.

## Schema, dữ liệu và sự cố

TypeORM dùng `migrationsRun: true` và `synchronize: false`. Thứ tự áp dụng gồm `CreateOrders1710000000000`, `AddUsersAndOrderOwner1710000001000`, `CreatePayments1710000002000` và `MvpPaymentIdempotency1710000003000`. Khi khởi động lại, TypeORM đọc bảng `migrations` để xác định việc còn phải thực hiện. Phần tạo schema trên database trắng dựa trên bằng chứng Giai đoạn 3, không tạo lại một volume mới trong lượt này. Integration và E2E giữ lại dữ liệu fixture trong database riêng, với định danh mới ở mỗi lượt.

Lỗi trang chi tiết sản phẩm bắt nguồn từ response `GET /products/:id` thiếu `options` dù HTTP 200. Controller trả thêm catalog size và topping mà backend dùng để tính giá. Regression test kiểm tra hợp đồng dữ liệu và E2E xác nhận chọn size L + Trân châu, giỏ 40.000 ₫, tạo đơn, thanh toán rồi đọc lại đúng mã đơn đã `PAID`.

Khi chạy `docker compose stop --timeout 10 api` trước bản sửa, API thoát `137` và `OOMKilled=false`. Docker gửi SIGTERM trước, rồi SIGKILL nếu tiến trình vượt quá thời hạn. Bootstrap chưa đăng ký shutdown hooks, API chạy trực tiếp trong container và chưa có init để chuyển tiếp tín hiệu. Bản sửa bật `enableShutdownHooks()` và cấu hình `init: true` cho API. [Tài liệu Docker về stop](https://docs.docker.com/reference/cli/docker/container/stop/)

Hai cảnh báo high từ npm audit là cùng một advisory qua đường `@nestjs/platform-express@12.2.0 → multer@2.4.0`. Advisory ảnh hưởng xử lý tải tệp multipart, repo hiện không có route upload hoặc interceptor Multer. Đã nâng riêng adapter lên `12.3.0`, dùng `multer@2.5.0` và giữ tương thích peer NestJS 12. Audit runtime API sau cập nhật báo 0. [GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m)

## Kết quả trên stack sau bản sửa

- Rebuild image API và xác nhận cả ba service `healthy`. `GET /health` trả HTTP 200 với `{"status":"ok","database":"up"}`.
- Dừng riêng API bằng `docker compose stop --timeout 10 api` sau bản sửa mất 0,56 giây. Container thoát `143` (SIGTERM), `OOMKilled=false`. Khởi động lại cùng volume, bảng migration vẫn có 4 bản ghi và số đơn `PAID` giữ nguyên 4 trước/sau. Bằng chứng Giai đoạn 3 cũng xác nhận đọc lại đúng đơn và payment sau restart.
- Chạy `npm run test:e2e -- --project=chromium --repeat-each=2 --workers=1` trong `apps/web` với `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`. Lần đầu có 1 PASS, 1 FAIL do timeout chờ kết quả đăng ký. Test được bổ sung điều kiện chờ form khởi tạo dựa trên link quay lại giỏ và xác nhận HTTP 201 từ API đăng ký. Lần chạy lại có **2 PASS, 0 FAIL**, lần lượt 8,6 và 9,1 giây. Chromium Headless Shell tải riêng từng báo `spawn UNKNOWN` trên Windows, nên nghiệm thu dùng Chrome đã cài.
- `git check-ignore` xác nhận bỏ qua file env local, `test-results`, báo cáo/cache Playwright, `node_modules`, `dist` và `.next`. `git ls-files -ci --exclude-standard` không trả file đã tracked thuộc các quy tắc ignore. `git diff --check` PASS.

## Giới hạn và kết luận

Audit đầy đủ của API còn 26 cảnh báo, gồm 2 package mức high trong dependency phát triển của `@nestjs/mau@0.2.9`: `inquirer → external-editor → tmp@0.0.33` và `undici@6.20.1`. npm đề xuất thay đổi ngoài dải phiên bản khai báo của Mau. Giữ nguyên công cụ này trong Task 5.2 vì chưa xác minh thay đổi tương thích. Các package này được loại khỏi image API runtime. Audit npm không bao phủ hệ điều hành trong image.

**Sáu tiêu chí Task 5.2 đạt trong môi trường local.** Thay đổi đủ điều kiện để nhóm rà soát và tự commit, push, mở PR. Trước khi stage, chỉ chọn file nguồn, cấu hình, lockfile và tài liệu của Task 5.2.
