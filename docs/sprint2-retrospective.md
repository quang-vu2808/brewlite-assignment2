# BrewLite Assignment 2 — Sprint 2 Retrospective

Tài liệu tổng hợp từ mã nguồn, Git history và các báo cáo nghiệm thu Task 5.1–5.3. Các hành động bên dưới là đề xuất cho Sprint tiếp theo.

## Những điều đã làm tốt

- **Kiểm chứng theo từng lớp.** Unit tests kiểm tra nghiệp vụ, integration tests chạy với PostgreSQL thật, còn Playwright kiểm tra luồng người dùng qua Web và API. Kiểm tra sau khi khởi động lại API đã xác nhận đơn hàng và thanh toán vẫn được lưu. [Task 5.1](task5.1-report.md) · [Task 5.2](task5.2-report.md)
- **Tách môi trường kiểm thử.** Docker Compose dùng PostgreSQL và volume riêng cho integration. CI tạo môi trường tạm để kiểm tra API và luồng E2E. Điều này giúp kiểm tra migration và dữ liệu thử mà vẫn bảo toàn dữ liệu demo. [CI workflow](../.github/workflows/ci.yml) · [Task 5.2](task5.2-report.md)
- **Tách kiểm tra, phát hành và triển khai.** Các PR lần lượt bàn giao MVP, tích hợp và CI/CD. Tag `v1.0.1` xác định commit phát hành. Release #2 qua Quality và Publish, lưu cặp digest trong artifact `candidate` và bỏ qua Deploy theo cấu hình. Bản production ổn định trước đó có bằng chứng Render, Neon và smoke HTTPS riêng. [Release Notes v1.0.1](release-notes-v1.0.1.md)
- **Kiểm tra các tình huống rollback khó.** Bộ Automatic Rollback và smoke local đạt **32/32 PASS**. Các test bao phủ POST mất phản hồi, lỗi phân trang và tình huống Web chưa được deploy khi API lỗi. Tình huống tự khôi phục sau một deployment thất bại thực tế trên Render vẫn chưa được kiểm chứng. [Task 5.3](task5.3-report.md)

## Khó khăn và bài học

| Chủ đề | Vấn đề ghi nhận | Bài học |
| --- | --- | --- |
| Git và CI/CD | CI sau PR #20 PASS, còn Release #2 publish image rồi bỏ qua Deploy. | Theo dõi riêng commit, tag, kết quả từng job và trạng thái production. Gắn kết quả smoke với revision đã kiểm chứng. |
| Hợp đồng API và E2E | `GET /products/:id` từng trả HTTP 200 nhưng thiếu `options`. Một lượt E2E từng timeout khi form đăng ký chưa khởi tạo xong. | Kiểm tra cấu trúc dữ liệu bên cạnh mã HTTP. Chờ tín hiệu UI hoặc phản hồi API có thể quan sát để test phản ánh đúng hành vi người dùng. |
| Docker | API từng thoát với mã `137` dù `OOMKilled=false`. Sau khi bật shutdown hooks và thêm `init: true`, API thoát `143` khi nhận SIGTERM và giữ dữ liệu qua lần khởi động lại. | Kiểm tra cách container dừng cùng với health check lúc khởi động. Đối chiếu log và trạng thái container trước khi kết luận nguyên nhân. |
| Migration | Local tự chạy migration lúc API khởi động. Production chạy lệnh migrate riêng từ image candidate qua kết nối Neon trực tiếp và advisory lock. | Kiểm tra số migration ở lần chạy mới và lần chạy lại. Đánh giá khả năng bản ứng dụng ổn định tiếp tục dùng schema đã cập nhật vì rollback image giữ nguyên schema. |
| Rollback | GHCR Image Index và manifest `linux/amd64` Render báo có thể dùng các digest khác nhau. POST timeout có thể xảy ra sau khi Render đã nhận yêu cầu. | Xác minh quan hệ giữa hai digest và revision, đọc trạng thái trước khi quyết định khôi phục, đồng thời giữ lại đường xử lý thủ công khi thiếu bằng chứng. |

Nguồn đối chiếu gồm [nghiệm thu Docker và E2E](task5.2-report.md) và [quy trình migration, smoke và rollback](task5.3-report.md#migration-smoke-và-rollback).

## Điểm cần cải thiện

- **Bằng chứng phát hành còn phân tán.** Nên nối CI run, Git tag, artifact digest và smoke theo từng môi trường để tránh đọc nhầm kết quả của bản ổn định trước đó thành kết quả của `v1.0.1`.
- **E2E trình duyệt còn tập trung vào một kịch bản.** Hai lượt lặp ở Task 5.2 giúp kiểm tra tính ổn định của kịch bản đặt hàng. Kiểm thử giao diện khi thanh toán thất bại, thử lại và chuyển tài khoản cần được bổ sung có chủ đích.
- **Cần kiểm chứng khôi phục ngoài mô phỏng.** Bộ test local bao phủ logic rollback, còn quy trình khôi phục bằng Render và khả năng chạy bản API ổn định sau migration cần có bằng chứng từ môi trường diễn tập.

## Hành động đề xuất cho Sprint tiếp theo

| Ưu tiên | Hành động | Tiêu chí hoàn tất |
| --- | --- | --- |
| Cao | Diễn tập một lỗi deploy hoặc smoke trên môi trường Render tách biệt. Thực hành cả bước khôi phục thủ công nếu tự động không hoàn tất. | Lưu deployment ID, cặp digest trước và sau, kết quả từng dịch vụ và smoke về đúng revision ổn định. Ghi riêng nguyên nhân lỗi và kết quả khôi phục. |
| Cao | Bổ sung bước kiểm tra tương thích migration trước khi duyệt Deploy. | Trên DB thử, migration chạy được ở lần đầu, chạy lại không phát sinh thay đổi ngoài dự kiến và API bản ổn định vẫn đọc/ghi được dữ liệu nghiệp vụ sau migration. |
| Cao | Thêm checklist bằng chứng vào quy trình phát hành. | Mỗi release có commit, tag, link CI/release run, artifact `candidate`, kết quả Deploy và lý do nếu bị bỏ qua. Lượt có deploy ghi thêm deployment ID, revision và kết quả smoke. |
| Trung bình | Bổ sung Playwright cho thanh toán mô phỏng thất bại rồi thử lại thành công. | Bài test xác nhận giữ giỏ sau lỗi, dùng lại đúng mã đơn và chỉ hiển thị một đơn đã thanh toán trong lịch sử. |
| Trung bình | Đưa kiểm tra dừng và khởi động lại API vào checklist nghiệm thu Docker. | Ghi thời gian dừng, mã thoát, kết quả health sau khi khởi động lại và xác nhận một đơn đã thanh toán vẫn đọc được. |

[README bàn giao](../README.md) · [Sprint 2 Review](sprint2-review.md) · [Runbook Task 5.3](task5.3-report.md)
