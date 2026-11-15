# BrewLite Assignment 2 — Sprint 2 Review

## Mục tiêu Sprint 2

Hoàn thiện luồng đặt đồ uống từ Menu đến xác nhận thanh toán và lịch sử đơn hàng. Kiểm chứng luồng trên PostgreSQL và trình duyệt, đóng gói ứng dụng bằng Docker, thiết lập CI/CD để phát hành image và chuẩn bị tài liệu bàn giao. Phạm vi này nối tiếp phần nền tảng và xem menu của Sprint 1. [Bối cảnh và phạm vi dự án](requirements/context-and-scope.md)

## Kết quả bàn giao

| Hạng mục | Kết quả đã ghi nhận |
| --- | --- |
| Danh mục và giỏ hàng | Xem menu và chi tiết đồ uống, chọn size và topping, thêm món và thay đổi số lượng trong giỏ. |
| Tài khoản và đặt hàng | Đăng ký, đăng nhập bằng JWT, tạo đơn từ giỏ. API kiểm tra tùy chọn, tính giá và lưu đơn cùng các dòng sản phẩm vào PostgreSQL. |
| Thanh toán và lịch sử | Mô phỏng thành công, thất bại và thử lại. Idempotency key ngăn ghi nhận thanh toán trùng. Người dùng chỉ xem và thanh toán đơn của mình. Lịch sử đơn vẫn truy cập được sau khi khởi động lại API. |
| Môi trường chạy | Docker Compose khởi động Web, API và PostgreSQL local. `GET /health` kiểm tra khả năng kết nối cơ sở dữ liệu. Đã xác minh bốn migration trên PostgreSQL local. |
| Phát hành và bàn giao | GitHub Actions kiểm tra API/Web và publish image lên GHCR theo Git tag. README hướng dẫn chạy và kiểm thử. Release Notes ghi phiên bản, trạng thái phát hành và giới hạn nghiệm thu. |

Git history ghi nhận PR #17 cho MVP khách hàng, PR #18 cho tích hợp, kiểm thử và Docker Compose, PR #20 cho triển khai và Automatic Rollback. Tag `v1.0.1` trỏ tới merge commit `ec1645da7e739ee50376e6229b8e8b4174c57376` của PR #20. [README](../README.md) · [Nghiệm thu Task 5.1](task5.1-report.md) · [Nghiệm thu Task 5.2](task5.2-report.md) · [Release Notes v1.0.1](release-notes-v1.0.1.md)

## Kết quả kiểm thử

| Nhóm kiểm thử | Kết quả | Phạm vi bằng chứng |
| --- | --- | --- |
| API | **60/60 unit tests PASS**, **3/3 HTTP Products PASS** | Jest và Supertest local. |
| Web | **38/38 unit/component tests PASS** | Vitest local. |
| Lint và build | **PASS** cho API và Web | Nghiệm thu local. |
| API integration | **15/15 PASS** | PostgreSQL thật trong môi trường test riêng. Bao phủ quyền sở hữu đơn, lưu đơn/thanh toán, idempotency, ràng buộc dữ liệu và rollback giao dịch. |
| Playwright E2E | **2/2 lượt lặp PASS** ở Task 5.2 và **1 lượt PASS** ở Task 5.3 | Một kịch bản đặt đồ uống từ Menu đến xác nhận thanh toán và mở lại đơn trong lịch sử. Chạy trên Chrome/Windows. |
| Automatic Rollback và smoke | **32/32 PASS** | Render giả lập và HTTP loopback ở local. |

Nguồn số liệu là các đợt nghiệm thu đã ghi trong [Task 5.2](task5.2-report.md) và [Task 5.3](task5.3-report.md).

## CI/CD và trạng thái production

| Mốc | Kết quả |
| --- | --- |
| CI sau merge PR #20 vào `main` | **PASS**. |
| Release `v1.0.1`, workflow #2 | Quality API, Quality Web và Publish Docker Images **PASS**. Hai image được đẩy lên GHCR, với digest và revision trong artifact `candidate`. Deploy **SKIPPED** vì `PROD_DEPLOY_ENABLED=false`. |
| Production ổn định trước `v1.0.1` | Web và API chạy trên Render. Neon PostgreSQL đã kết nối, áp dụng bốn migration và smoke test HTTPS **PASS**. Đã đối chiếu GHCR Image Index với manifest `linux/amd64` trên Render cho cả hai dịch vụ. |

Các URL [Web](https://brewlite-web-gfr9.onrender.com), [API](https://brewlite-api-2u7z.onrender.com) và [Health](https://brewlite-api-2u7z.onrender.com/health) là địa chỉ của môi trường production đã dùng để nghiệm thu bản ổn định trước đó. Kết quả publish `v1.0.1` xác nhận image đã có trên GHCR. Job Deploy của lượt này được bỏ qua. [Nghiệm thu Task 5.3](task5.3-report.md#bằng-chứng-nghiệm-thu-task-53)

## Kịch bản có thể trình diễn

1. Khởi động stack local theo README, mở Menu và kiểm tra `GET /health`.
2. Chọn đồ uống, size và topping. Thêm món vào giỏ, đổi số lượng rồi kiểm tra tổng tiền khi tạo đơn.
3. Đăng ký tài khoản demo, đăng nhập, tạo đơn và thanh toán mô phỏng. Trên local, có thể minh họa một lần thanh toán thất bại rồi thử lại thành công trên cùng đơn.
4. Mở lại đúng mã đơn đã thanh toán trong lịch sử. Có thể trình diễn thêm việc khởi động lại API rồi đăng nhập lại để kiểm tra đơn còn lưu.
5. Mở bảng kết quả Release #2 và artifact `candidate` để minh họa hai digest trên GHCR cùng trạng thái Deploy **SKIPPED**. [Hướng dẫn trình diễn local](../README.md) · [Thông tin release](release-notes-v1.0.1.md)

## Hạng mục còn mở và hướng phát triển

| Hạng mục | Trạng thái và bước tiếp theo |
| --- | --- |
| Triển khai `v1.0.1` | Release #2 bỏ qua Deploy. Trong đợt triển khai được duyệt, cần ghi lại deployment ID, digest và kết quả smoke theo đúng revision. |
| Automatic Rollback trên Render | Chưa kiểm chứng bằng một deployment thất bại thực tế. Nên diễn tập ở môi trường Render tách biệt, kiểm tra khả năng đưa cả hai dịch vụ về bản ổn định và chạy lại smoke. |
| Thanh toán | Sprint bàn giao ví/thẻ mô phỏng, không phát sinh giao dịch tiền thật. |
| Phạm vi nghiệp vụ mở rộng | Các tài liệu hiện có chưa xác nhận nghiệm thu kiểm soát tồn kho khi đặt đồng thời, khuyến mãi, điểm thưởng hoặc khả năng PWA ngoại tuyến. Cần rà soát phạm vi và tiêu chí chấp nhận trước khi đưa vào sprint sau. |

[Tài liệu phạm vi](requirements/context-and-scope.md) · [Runbook triển khai và rollback](task5.3-report.md#migration-smoke-và-rollback)
