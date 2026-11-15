# Task 5.3 — Render Free, Neon Free và GHCR

## Trạng thái

CI trên `main` đã PASS sau khi merge PR #20. Release `v1.0.1` đã hoàn tất kiểm tra chất lượng và publish image API/Web lên GHCR. Job Deploy được bỏ qua vì `PROD_DEPLOY_ENABLED=false`.

Web và API phiên bản ổn định trước đó đã chạy trên Render. Kết nối Neon PostgreSQL, 4 migration và smoke test HTTPS đã được xác minh trên phiên bản đó. Automatic Rollback đã qua kiểm thử local và chưa được kiểm chứng bằng một deployment thất bại trên Render.

Luồng release đi từ tag `vMAJOR.MINOR.PATCH` qua quality, build và publish image `linux/amd64`, migration, deploy API, deploy Web, smoke HTTPS và lưu manifest ổn định. PR vào `main` và push lên `main` chạy CI. Tag release phải trỏ tới commit thuộc lịch sử `origin/main`. Các lượt release dùng chung một nhóm concurrency với `cancel-in-progress: false`. Job Deploy chỉ chạy khi biến cấp repository `PROD_DEPLOY_ENABLED` bằng `true`.

## Thiết lập thủ công

1. Trên Neon, tạo project Free và chọn PostgreSQL 17 nếu có. Chọn một DB dành riêng cho demo. Dùng hostname kết nối **direct** để chạy migration vì advisory lock gắn với phiên PostgreSQL. Lưu username và password của role migration riêng. Cấp role API quyền kết nối, sử dụng schema và đọc/ghi vào các bảng cần thiết; chuẩn bị quyền mặc định cho bảng do role migration tạo. Xác minh bằng môi trường thử riêng trước khi phát hành. [Neon TLS](https://neon.com/docs/connect/connect-securely)
2. Sau khi review và hợp nhất code, chọn hai tên dịch vụ Render Free và thiết lập `PROD_API_URL` theo hostname API dự kiến. Có thể phát hành tag đầu tiên với deploy tắt để tạo candidate images. Nếu hostname thực tế khác, cập nhật URL và build lại bằng release mới.
3. Tạo hai Render **Web Service → Existing Image → Free**, trỏ lần lượt tới package API/Web trên GHCR, giữ cùng tên package qua các release. Nếu dùng package private, tạo registry credential chỉ đọc có quyền `read:packages` và cấp quyền đọc đúng package. Tắt autodeploy. Render có thể khởi tạo lượt chạy đầu ngay khi tạo service. Giữ dịch vụ ở trạng thái chuẩn bị cho đến khi DB và env đã sẵn sàng. [Render image-backed services](https://render.com/docs/deploying-an-image)
4. API dùng health path `/health`. Trong Render API env đặt `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`, `DB_MIGRATIONS_RUN=false`, `JWT_SECRET`, `WEB_ORIGIN` và `PAYMENT_DEMO_ENABLED=false`. `WEB_ORIGIN` là HTTPS origin Web, không có dấu slash cuối. API bind `0.0.0.0` và đọc `PORT` do Render cấp. Web standalone đã bind `0.0.0.0` và đọc `PORT` runtime. URL API public được nhúng trong Web khi build.
5. Tạo GitHub Environment `production`, chỉ cho phép tag release tin cậy và thêm reviewer nếu plan cho phép. Bảo vệ quyền tạo tag và thay đổi workflow trên main. Sau khi xác nhận tài nguyên, bật deploy và dùng tag mới. Với lần đầu đặt `PROD_FIRST_RELEASE=true`, để trống ba biến stable. Sau khi smoke PASS, lưu artifact `stable-*` và cập nhật ba biến stable từ manifest. Sau đó, đặt `PROD_FIRST_RELEASE=false`. Không bật release tiếp khi các biến còn trỏ sai phiên bản.

| Nơi cấu hình | Tên |
| --- | --- |
| GitHub repository variables | `PROD_DEPLOY_ENABLED`, `PROD_API_URL` |
| GitHub Environment `production` variables | `PROD_WEB_URL`, `RENDER_API_SERVICE_ID`, `RENDER_WEB_SERVICE_ID`, `NEON_DIRECT_HOST`, `NEON_DB_NAME`, `NEON_MIGRATION_USER`, `PROD_FIRST_RELEASE`, `PROD_STABLE_API_IMAGE`, `PROD_STABLE_WEB_IMAGE`, `PROD_STABLE_REVISION` |
| GitHub Environment `production` secrets | `RENDER_API_KEY`, `NEON_MIGRATION_PASSWORD` |
| GitHub tự cấp | `GITHUB_TOKEN`, quyền `packages: write` ở job Publish và `packages: read` ở job Deploy |
| Render registry credential nếu package private | GitHub username và pull token có quyền đọc package |
| Render API secrets | `DB_PASSWORD`, `JWT_SECRET` (tối thiểu 32 byte) |

Job Publish cần `PROD_API_URL` ở cấp repository khi build image Web. Job Deploy chạy trong Environment `production` và đọc `PROD_WEB_URL` từ Environment này theo cấu hình đã xác nhận.

## Migration, smoke và rollback

- Release kéo API image theo digest và chạy `node dist/database/migrate.js` với quyền migration. Cùng bộ migration và runtime dependencies có sẵn trong image. PostgreSQL dùng TLS với xác minh chứng chỉ. Lệnh giữ advisory lock và chạy migration trong transaction, báo số migration đã áp dụng. API trên Neon từ chối cấu hình thiếu TLS hoặc bật migration lúc boot. Local tiếp tục auto-migrate như Task 5.2.
- Chỉ phát hành migration tương thích với API cũ đang phục vụ, theo hướng mở rộng schema trước và dọn trường cũ ở release sau. Cần có bản sao hoặc khả năng restore Neon đã diễn tập và chính sách giữ dữ liệu phù hợp. Workflow không tự revert, xóa hay restore DB.
- Render API nhận digest cụ thể và workflow poll **deployment ID** đến `live`, kiểm tra image được báo. Smoke đọc health, danh mục, tùy chọn sản phẩm, CORS, manifest Web và URL API trong bundle. Cả hai revision phải khớp candidate. Smoke retry trong giới hạn để chịu cold start. [Render Trigger deploy](https://api-docs.render.com/reference/create-deploy), [Retrieve deploy](https://api-docs.render.com/reference/retrieve-deploy)
- Trước migration, workflow kiểm tra revision đang phục vụ bằng smoke HTTPS và lưu artifact `rollback-*` chứa `api`, `web`, `revision` từ ba biến `PROD_STABLE_*`. Trước POST, workflow kiểm tra lại định dạng manifest, đối chiếu cả hai digest với deploy `live` trên Render và từ chối rollout nếu có deploy đang chờ. Nếu lỗi trước POST, không chạy rollback. First release không có đích để rollback.
- Sau khi bắt đầu POST candidate, lỗi deploy API/Web hoặc smoke sẽ khôi phục theo digest ổn định cho dịch vụ đã thử deploy candidate. Với dịch vụ chưa thử deploy, workflow chỉ dùng GET để đối chiếu danh sách ID, ID đang live và digest ổn định với trạng thái trước rollout. Nếu POST mất phản hồi, workflow dùng GET để tìm deployment mới theo ID/digest và đợi trạng thái kết thúc trong thời hạn. Workflow không lặp POST. Nếu chưa biết chắc trạng thái một dịch vụ, workflow không gửi một POST cạnh tranh cho dịch vụ đó; vẫn xử lý dịch vụ còn lại. Tắt autodeploy trên Render và tránh deploy thủ công đồng thời.
- Báo cáo `rollout-result-*` ghi bước lỗi, ID deploy tìm được, kết quả từng dịch vụ và smoke với revision ổn định. Rollback chỉ PASS khi smoke ổn định PASS và mỗi dịch vụ đã khôi phục hoặc được xác minh là không thay đổi. Release vẫn FAIL kể cả khi rollback PASS. Runner bị hủy hoặc hết thời gian có thể không xuất được artifact; kiểm tra lịch sử Render trong trường hợp này.
- Rollback chỉ thay image. Migration đã áp dụng vẫn giữ nguyên. Trước khi duyệt release, kiểm tra migration theo hướng mở rộng schema và bảo đảm API cũ chạy được trên schema mới; smoke không kiểm tra hết các đường ghi dữ liệu.
- Nếu rollback không hoàn chỉnh, giữ deploy tắt, kiểm tra lịch sử và ID deploy của cả hai dịch vụ trong Render Dashboard, chờ hàng đợi kết thúc hoặc xử lý deploy pending theo runbook. Xác nhận tương thích schema trước khi khôi phục đúng hai digest từ `rollback-*`. Nếu không thể chọn bản cũ trong Dashboard, triển khai lại đúng digest đã lưu. Kiểm tra từng digest `live`, rồi chạy `node deploy/smoke.mjs` với `PROD_API_URL`, `PROD_WEB_URL` và `RELEASE_REVISION` của bản ổn định. Không tự revert DB. [Render List deploys](https://api-docs.render.com/reference/list-deploys), [Render rollbacks](https://render.com/docs/rollbacks)
- Chỉ sau release thành công và kiểm tra artifact `stable-*`, người vận hành cập nhật cả ba biến `PROD_STABLE_API_IMAGE`, `PROD_STABLE_WEB_IMAGE`, `PROD_STABLE_REVISION` từ trường `api`, `web`, `revision`. Đặt `PROD_FIRST_RELEASE=false` sau release đầu tiên và giữ cặp digest/manifest còn kéo được để phục hồi.

## Bằng chứng nghiệm thu Task 5.3

| Phạm vi | Bằng chứng | Kết quả |
| --- | --- | --- |
| CI trên `main` | PR #20, merge commit `ec1645da7e739ee50376e6229b8e8b4174c57376` | **PASS** |
| Release `v1.0.1`, workflow #2 | Quality API, Quality Web, Publish Docker Images | **PASS** cả ba job, có artifact `candidate` |
| Deploy của `v1.0.1` | `PROD_DEPLOY_ENABLED=false` | **SKIPPED** |
| Production phiên bản ổn định trước đó | Web và API trên Render, kết nối Neon PostgreSQL, 4 migration đã áp dụng | **PASS** |
| Smoke test production | Kiểm tra HTTPS với revision của phiên bản ổn định trước đó | **PASS** |
| Đối chiếu image API và Web | Digest của GHCR Image Index và digest manifest `linux/amd64` do Render báo | **PASS** cho cả hai dịch vụ |
| Automatic Rollback và smoke local | Render giả lập và HTTP loopback | **32/32 PASS** |
| Automatic Rollback trên Render | Khôi phục và smoke sau một deployment thất bại thực tế | **CHƯA KIỂM THỬ** |

## Kiểm chứng và giới hạn

- Automatic Rollback và smoke local chạy bằng `node --test deploy/release.test.mjs deploy/smoke.test.mjs`. Các kịch bản bao gồm deploy API/Web thất bại, POST mất phản hồi, rollback một phần, xác minh dịch vụ chưa đổi, lỗi phân trang Render và smoke sau rollback thất bại. Kiểm tra cú pháp Node.js và phân tích cú pháp YAML của workflow đã PASS.
- Kiểm chứng local trước đó ghi nhận **60 API unit tests** và **38 Web unit tests** PASS, cùng lint và build của cả hai ứng dụng. PostgreSQL tách biệt tại cổng 55439 có **15 integration tests** PASS. Có **4 migration** được áp dụng ở lần đầu và **0 migration** được áp dụng thêm khi chạy lại trên cơ sở dữ liệu kiểm tra. Bộ Supertest HTTP Products có **3 test** PASS.
- Docker Compose ở project tạm với Web/API tại 3180/3181 đã qua bước kiểm tra cấu hình, build hai image, health check ba dịch vụ và smoke HTTP. Playwright có **1 E2E test** PASS trên Chrome Windows.
- Lượt release #2 kết thúc sau publish. Kết quả Render, Neon và smoke HTTPS thuộc phiên bản ổn định trước đó. Việc đối chiếu manifest xác nhận danh tính image của hai dịch vụ. Lượt khôi phục tự động sau lỗi triển khai trên Render vẫn cần được kiểm chứng riêng.
- Render Free có cold start, quota dùng chung, filesystem tạm và giới hạn lưu lượng outbound. Chưa đo mức dùng RAM, độ trễ cold start và mức dùng quota. [Giới hạn Render Free](https://render.com/docs/free)

## Bàn giao phát hành

1. Rà soát workflow và giữ các file cấu hình local chứa thông tin nhạy cảm ngoài Git.
2. Lưu kết quả CI, artifact `candidate` và digest của cả hai image theo từng release. Khi Deploy được phép chạy, lưu thêm deployment ID, kết quả smoke HTTPS, `rollout-result-*` và `stable-*` nếu có.
3. Với một release production được phê duyệt, kiểm tra cặp digest ổn định, khả năng kéo image, quyền chạy migration và tính tương thích của schema trước khi bật deploy và phát hành tag SemVer mới.
4. Sau smoke PASS, cập nhật các biến `PROD_STABLE_*` từ artifact `stable-*`. Nếu rollout hoặc khôi phục thất bại, dùng quy trình khôi phục thủ công ở trên.
