# BrewLite Assignment 2 — Ghi chú phát hành v1.0.1

Docker image Web và API của `v1.0.1` đã được phát hành lên GHCR sau khi qua kiểm tra chất lượng. Deploy được bỏ qua vì `PROD_DEPLOY_ENABLED=false`, nên các URL production bên dưới phục vụ phiên bản ổn định trước đó.

## Thông tin phiên bản

| Hạng mục | Giá trị |
| --- | --- |
| Phiên bản và Git tag | `v1.0.1` |
| Commit phát hành | `ec1645da7e739ee50376e6229b8e8b4174c57376` |
| Nguồn phát hành | Merge PR #20 vào `main` |
| Thời điểm tạo tag | 15/11/2026, 16:47:37 (UTC+07:00) |
| Lượt chạy | GitHub Actions Release #2 |
| Kết quả | Quality API, Quality Web và Publish Docker Images **PASS**. Deploy **SKIPPED** |

## Chức năng đã bàn giao

- Xem danh mục và chi tiết đồ uống, chọn size và topping, cập nhật số lượng trong giỏ hàng.
- Đăng ký, đăng nhập và xác thực bằng JWT. Người dùng chỉ có quyền xem và thanh toán đơn hàng của mình.
- Tạo đơn từ giỏ hàng. API kiểm tra sản phẩm và tùy chọn, tính lại giá và lưu đơn vào PostgreSQL.
- Thanh toán mô phỏng qua ví hoặc thẻ, xử lý thử lại khi thất bại và chống xử lý trùng theo idempotency key.
- Xem xác nhận thanh toán và lịch sử đơn hàng. Kiểm chứng local đã xác nhận dữ liệu vẫn truy cập được sau khi khởi động lại API. [Nghiệm thu Task 5.1](task5.1-report.md)
- Chạy Web, API và PostgreSQL bằng Docker Compose local. Endpoint `GET /health` kiểm tra kết nối cơ sở dữ liệu. [Nghiệm thu Task 5.2](task5.2-report.md)

## Công nghệ và môi trường

Next.js 16 cung cấp giao diện Web. NestJS 12 cung cấp API REST và dùng TypeORM để truy cập PostgreSQL. Docker đóng gói Web và API thành hai image. Docker Compose dùng PostgreSQL 17 cho môi trường local. GitHub Actions phát hành image lên GitHub Container Registry (GHCR). Bản production ổn định chạy Web và API trên Render, với PostgreSQL trên Neon qua TLS.

## Kết quả kiểm thử đã ghi nhận

| Hạng mục | Kết quả | Phạm vi |
| --- | --- | --- |
| API unit và HTTP Products | **60/60 unit tests PASS**, **3/3 HTTP tests PASS** | Jest và Supertest local |
| Web unit/component | **38/38 PASS** | Vitest local |
| Lint và build | **PASS** cho API và Web | Nghiệm thu local Task 5.3 |
| API integration | **15/15 PASS** | PostgreSQL thật trong môi trường kiểm thử tách biệt |
| Playwright E2E | **2/2 lượt lặp PASS** ở Task 5.2. **1 lượt PASS** ở Task 5.3 | Cùng kịch bản từ Menu đến xác nhận thanh toán và lịch sử đơn hàng, chạy bằng Chrome trên Windows |
| CI trên `main` | **PASS** | GitHub Actions sau merge PR #20 |
| CI của release `v1.0.1` | Quality API và Quality Web **PASS** | Release workflow #2 |

Nguồn số liệu kiểm thử và CI là các báo cáo nghiệm thu [Task 5.2](task5.2-report.md) và [Task 5.3](task5.3-report.md#bằng-chứng-nghiệm-thu-task-53).

## Phát hành Docker image lên GHCR

1. Khi tag SemVer được push, [release workflow](../.github/workflows/release.yml) kiểm tra commit thuộc lịch sử `origin/main` và chạy Quality cho API và Web.
2. Khi Quality PASS, job Publish build hai image `linux/amd64`, gắn tag `sha-<commit>` và đẩy lên GHCR. URL API công khai được cấu hình tại thời điểm build Web.
3. Job Publish lấy digest của từng image và lưu cặp digest cùng Git SHA, tag và revision vào `candidate.json` trong artifact `candidate`.
4. Job Deploy chỉ chạy khi `PROD_DEPLOY_ENABLED=true`. Lượt phát hành `v1.0.1` đã publish thành công và dừng ở artifact `candidate` vì biến này bằng `false`.

## Production và các giới hạn

Các địa chỉ sau thuộc phiên bản ổn định trên Render trước `v1.0.1`. Phiên bản đó đã kết nối Neon, áp dụng đủ 4 migration và qua smoke test HTTPS. Các kết quả production này thuộc đợt triển khai trước Release #2. [Bằng chứng nghiệm thu Task 5.3](task5.3-report.md#bằng-chứng-nghiệm-thu-task-53)

| Dịch vụ | URL |
| --- | --- |
| Web | [https://brewlite-web-gfr9.onrender.com](https://brewlite-web-gfr9.onrender.com) |
| API | [https://brewlite-api-2u7z.onrender.com](https://brewlite-api-2u7z.onrender.com) |
| Health | [https://brewlite-api-2u7z.onrender.com/health](https://brewlite-api-2u7z.onrender.com/health) |

- Thanh toán chỉ là mô phỏng, không phát sinh giao dịch tiền thật.
- Bộ Automatic Rollback và smoke đạt **32/32 PASS** khi kiểm thử local với Render giả lập và HTTP loopback. Chưa kiểm chứng khả năng tự khôi phục sau một deployment thất bại thực tế trên Render.
- Khôi phục image giữ nguyên các migration đã áp dụng. Khi cần khôi phục thủ công, kiểm tra trạng thái triển khai và tính tương thích schema trước khi dùng lại cặp digest ổn định. [Hướng dẫn migration, smoke và rollback](task5.3-report.md#migration-smoke-và-rollback)

## Tài liệu bàn giao

- [README — chạy local, Docker Compose và kiểm thử](../README.md)
- [Hướng dẫn cấu hình triển khai trên Render, Neon và GitHub Actions](task5.3-report.md#thiết-lập-thủ-công)
- [Runbook rollback và khôi phục thủ công](task5.3-report.md#migration-smoke-và-rollback)
