# Task 5.3 — Render Free, Neon Free và GHCR

## Trạng thái

Đã chuẩn bị code CI/CD cho môi trường demo. GitHub Actions, GHCR publish, Render deploy, Neon TLS và smoke HTTPS công khai đều **NOT VERIFIED**. Lượt này chỉ kiểm chứng local và dùng tài liệu công khai.

Luồng release: tag `vMAJOR.MINOR.PATCH` → quality → build và push Web/API linux/amd64 → migration → deploy API → deploy Web → smoke HTTPS → lưu manifest ổn định. PR và push vào `main` chỉ chạy CI; tag phải trỏ tới commit thuộc lịch sử `origin/main`. Workflow khóa theo môi trường, không hủy release đang thực thi. `PROD_DEPLOY_ENABLED` là biến cấp repository và mặc định phải để trống hoặc `false`.

## Thiết lập thủ công

1. Trên Neon, tạo project Free và chọn PostgreSQL 17 nếu có. Chọn một DB dành riêng cho demo. Dùng hostname kết nối **direct** để chạy migration vì advisory lock gắn với phiên PostgreSQL. Lưu username và password của role migration riêng. Cấp role API quyền kết nối, sử dụng schema và đọc/ghi vào các bảng cần thiết; chuẩn bị quyền mặc định cho bảng do role migration tạo. Xác minh bằng môi trường thử riêng trước khi phát hành. [Neon TLS](https://neon.com/docs/connect/connect-securely)
2. Sau khi review và hợp nhất code, chọn hai tên dịch vụ Render Free và thiết lập `PROD_API_URL` theo hostname API dự kiến. Có thể phát hành tag đầu tiên với deploy tắt để tạo candidate images. Nếu hostname thực tế khác, cập nhật URL và build lại bằng release mới.
3. Tạo hai Render **Web Service → Existing Image → Free**, trỏ lần lượt tới package API/Web trên GHCR, giữ cùng tên package qua các release. Nếu dùng package private, tạo registry credential chỉ đọc có quyền `read:packages` và cấp quyền đọc đúng package. Tắt autodeploy. Render có thể khởi tạo lượt chạy đầu ngay khi tạo service. Giữ dịch vụ ở trạng thái chuẩn bị cho đến khi DB và env đã sẵn sàng. [Render image-backed services](https://render.com/docs/deploying-an-image)
4. API dùng health path `/health`. Trong Render API env đặt `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`, `DB_MIGRATIONS_RUN=false`, `JWT_SECRET`, `WEB_ORIGIN` và `PAYMENT_DEMO_ENABLED=false`. `WEB_ORIGIN` là HTTPS origin Web, không có dấu slash cuối. API bind `0.0.0.0` và đọc `PORT` do Render cấp. Web standalone đã bind `0.0.0.0` và đọc `PORT` runtime. URL API public được nhúng trong Web khi build.
5. Tạo GitHub Environment `production`, chỉ cho phép tag release tin cậy và thêm reviewer nếu plan cho phép. Bảo vệ quyền tạo tag và thay đổi workflow trên main. Sau khi xác nhận tài nguyên, bật deploy và dùng tag mới. Với lần đầu đặt `PROD_FIRST_RELEASE=true`, để trống ba biến stable. Sau khi smoke PASS, lưu artifact `stable-*` và cập nhật ba biến stable từ manifest, rồi bỏ cờ first release. Không bật release tiếp khi các biến còn trỏ sai phiên bản.

| Nơi cấu hình | Tên |
|---|---|
| GitHub repository variables | `PROD_DEPLOY_ENABLED`, `PROD_API_URL`, `PROD_WEB_URL` |
| GitHub Environment variables | `RENDER_API_SERVICE_ID`, `RENDER_WEB_SERVICE_ID`, `NEON_DIRECT_HOST`, `NEON_DB_NAME`, `NEON_MIGRATION_USER`, `PROD_FIRST_RELEASE`, `PROD_STABLE_API_IMAGE`, `PROD_STABLE_WEB_IMAGE`, `PROD_STABLE_REVISION` |
| GitHub Environment secrets | `RENDER_API_KEY`, `NEON_MIGRATION_PASSWORD` |
| GitHub tự cấp | `GITHUB_TOKEN`, quyền ghi package chỉ ở publish job |
| Render registry credential nếu package private | GitHub username và pull token có quyền đọc package |
| Render API secrets | `DB_PASSWORD`, `JWT_SECRET` (tối thiểu 32 byte) |

## Migration, smoke và rollback

- Release kéo API image theo digest và chạy `node dist/database/migrate.js` với quyền migration. Cùng bộ migration và runtime dependencies có sẵn trong image. PostgreSQL dùng TLS với xác minh chứng chỉ. Lệnh giữ advisory lock và chạy migration trong transaction, báo số migration đã áp dụng. API trên Neon từ chối cấu hình thiếu TLS hoặc bật migration lúc boot. Local tiếp tục auto-migrate như Task 5.2.
- Chỉ phát hành migration tương thích với API cũ đang phục vụ, theo hướng mở rộng schema trước và dọn trường cũ ở release sau. Cần có bản sao hoặc khả năng restore Neon đã diễn tập và chính sách giữ dữ liệu phù hợp. Workflow không tự revert, xóa hay restore DB.
- Render API nhận digest cụ thể và workflow poll **deployment ID** đến `live`, kiểm tra image được báo. Smoke đọc health, danh mục, tùy chọn sản phẩm, CORS, manifest Web và URL API trong bundle. Cả hai revision phải khớp candidate. Smoke retry trong giới hạn để chịu cold start. [Render Trigger deploy](https://api-docs.render.com/reference/create-deploy), [Retrieve deploy](https://api-docs.render.com/reference/retrieve-deploy)
- Trước rollout, workflow xác nhận revision đang phục vụ và lưu `rollback-*` chứa cặp digest ổn định được nhóm chỉ định. Khi lỗi, workflow giữ FAIL. Rollback thủ công để tránh chồng với deploy đang chờ hoặc schema không tương thích. Kiểm tra Render đã hết deploy pending và khóa đợt phát hành mới, xác nhận schema, sau đó chọn đúng deploy ổn định của **cả hai service** trong Dashboard. Render Free chỉ giữ hai deploy trước cho thao tác Rollback; nếu bản đó đã ra khỏi danh sách, chọn lại image ref theo digest đã lưu và deploy thủ công. Chạy lại smoke với revision ổn định. Lần đầu chưa có bản trước. Giữ lại digest ổn định và manifest ngoài thời hạn artifact. [Render Free](https://render.com/docs/free), [Render rollbacks](https://render.com/docs/rollbacks)

## Kiểm chứng và giới hạn

- Local: API unit **60 PASS**, Web unit **38 PASS**, lint hai app và build hai app **PASS**. API build ban đầu báo lỗi kiểu TypeORM, đã sửa và chạy lại.
- PostgreSQL local tách biệt tại cổng 55439: **15 integration PASS**. Lệnh migration áp dụng **4 rồi 0** trên database kiểm tra mới cả từ build local và từ image API runtime linux/amd64. Supertest HTTP Products **3 PASS**. Chưa chạy các kiểm tra này trên Neon.
- Docker Compose ở project tạm với Web/API tại 3180/3181: config, build cả hai image, health ba dịch vụ, smoke HTTP và **1 Playwright E2E PASS** trên Chrome Windows. Fixture smoke **1 PASS** và bao phủ sai revision, DB down, CORS sai và bundle sai URL. Hai workflow parse được bằng js-yaml. `actionlint` không có sẵn trong môi trường này.
- Render Free có cold start, quota dùng chung, filesystem tạm và giới hạn traffic outbound có thể ảnh hưởng kết nối Neon. **Chưa đo** RAM 512 MB, latency cold start, quota, kết nối TLS Neon thực hay quyền DB/registry thực. Chọn vùng Render/Neon gần nhau nếu plan cho phép. [Giới hạn Render Free](https://render.com/docs/free)
- Sau khi có workflow run thật, lưu kết quả quality gate, candidate/stable manifest, deployment ID, URL HTTPS và kết quả smoke. Chỉ báo **CI PASS**, **GHCR PUBLISH PASS** hoặc **PRODUCTION DEPLOY PASS** với bằng chứng tương ứng.

## Bàn giao phát hành

1. Xem `git status --short` và `git diff --check`, rà soát từng file nguồn, workflow và tài liệu trước khi tự stage/commit. Giữ mọi file env local ngoài Git.
2. Push branch, mở PR và kiểm tra kết quả CI thật trên GitHub. Chromium Linux trong workflow cần được xác minh qua lượt chạy này. Sau khi CI xanh, review và merge.
3. Thiết lập repository variables và bảo vệ tag. Giữ deploy tắt, tạo và push tag SemVer đầu tiên trên commit main để publish candidate. Xác minh hai digest và quyền kéo package.
4. Hoàn tất thiết lập Neon, Render và Environment, bật deploy rồi phát hành bằng một tag SemVer mới. Quan sát migration, deployment ID, smoke và artifact stable. Nếu luồng dừng giữa chừng, xác minh trạng thái dịch vụ trước khi chạy tiếp hoặc rollback.
