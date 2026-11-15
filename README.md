# BrewLite – Assignment 2

BrewLite là đồ án học phần **Công nghệ phần mềm – Trường Đại học Sài Gòn**, xây dựng ứng dụng đặt và thanh toán đồ uống mô phỏng. Assignment 2 bao gồm phân tích yêu cầu, mô hình UML, thiết kế kiến trúc, MVP khách hàng, kiểm thử tích hợp, CI/CD và triển khai demo.

Luồng hiện có: **Menu → Chi tiết sản phẩm → Giỏ hàng → Đăng ký/Đăng nhập → Tạo đơn → Thanh toán mô phỏng → Xác nhận → Lịch sử đơn hàng**. Hệ thống không thu tiền thật.

## 1. Phạm vi và tiến độ

| Task | Nội dung và tài liệu thực tế | Trạng thái được ghi nhận |
| --- | --- | --- |
| 1 | [Bối cảnh và phạm vi](docs/requirements/context-and-scope.md), [SRS](docs/requirements/srs.md), [đặc tả UC-18](docs/requirements/use-case-checkout.md) | Có tài liệu phân tích; một số quyết định nghiệp vụ vẫn là dự thảo/chờ nhóm xác nhận, không đồng nghĩa mọi yêu cầu đã được lập trình |
| 2 | [Các sơ đồ UML](docs/diagrams/) gồm Use Case, Activity, Sequence và Class; có nguồn PlantUML và ảnh PNG, gồm các bản tập trung vào checkout/domain | Có mô hình trong repository; không tự coi tất cả mô hình đã được duyệt hoặc hiện thực đầy đủ |
| 3 | [Kiến trúc](docs/architecture/architecture.md), [ADR](docs/architecture/adr/), [thiết kế triển khai](docs/requirements/deployment.md), [Deployment Diagram](docs/architecture/deployment.puml) | Có thiết kế phân lớp/modular monolith và triển khai đề xuất; các ADR đang Proposed, không phải bằng chứng đã triển khai production |
| 4.1 | Có cấu trúc repository, tài liệu và hai ứng dụng trong `apps/` | Chưa có đặc tả Task 4.1 hoặc bằng chứng nghiệm thu riêng trong repository để đối chiếu đầy đủ; chưa kết luận hoàn thành |
| 4.2 | Có mã nguồn, cấu hình và kiểm thử API/Web | Chưa có đặc tả Task 4.2 hoặc bằng chứng nghiệm thu riêng trong repository để đối chiếu đầy đủ; chưa kết luận hoàn thành |
| 4.3 | `apps/api` và `apps/web`: API sản phẩm, menu và các trạng thái tải/rỗng/lỗi/thử lại | Đã có mã nguồn và kiểm thử; tiếp tục được tích hợp với MVP |
| 4.4 | [GitHub Actions CI](.github/workflows/ci.yml) cho API và Web | Có quality gate cho API và Web. CI hiện tại mở rộng kiểm thử trong Task 5.2 và 5.3 |
| 5.1 | MVP khách hàng, lưu dữ liệu PostgreSQL, xác thực, đơn hàng và thanh toán mô phỏng | Đã nghiệm thu chức năng bắt buộc trong môi trường local theo [báo cáo Task 5.1](docs/task5.1-report.md), ngày 14/11/2026 |
| 5.2 | Health, integration với PostgreSQL, Docker Compose và Playwright E2E | Xem [báo cáo Task 5.2](docs/task5.2-report.md) |
| 5.3 | Release theo tag, GHCR, Render, Neon và Automatic Rollback | Xem [báo cáo Task 5.3](docs/task5.3-report.md) và [bằng chứng nghiệm thu bên dưới](#bằng-chứng-nghiệm-thu) |
| 5.4 | Hướng dẫn chạy, kiểm thử, phát hành và bàn giao | Tài liệu bàn giao trong README này |

## 2. Công nghệ và kiến trúc hiện tại

- **Web:** Next.js 16, React 19, TypeScript; App Router và các context provider cho Auth, Cart, Checkout. Kiểm thử bằng Vitest, Testing Library và jsdom; lint bằng ESLint.
- **API:** NestJS 12, TypeScript, REST; DTO với class-validator/class-transformer; xác thực JWT và băm mật khẩu bằng bcrypt. Kiểm thử bằng Jest/Supertest; lint bằng Oxlint có kiểm tra kiểu.
- **Dữ liệu:** PostgreSQL 17, TypeORM và migration có phiên bản. `synchronize: false`. API tự áp dụng migration còn thiếu khi chạy local. Production chạy migration riêng trong release workflow.
- **Môi trường:** Node.js 24, npm, Docker Engine/Docker Desktop và Docker Compose cho local và integration, GitHub Actions cho CI/CD.

Trình duyệt gọi NestJS qua HTTP/JSON. Backend quyết định giá, tổng tiền, quyền sở hữu đơn và kết quả thanh toán. Danh mục sản phẩm mẫu và metadata size/topping hiện nằm trong mã backend; PostgreSQL lưu người dùng, đơn hàng, dòng sản phẩm trong đơn và thanh toán. Không mô tả sản phẩm, khuyến mãi, tồn kho hay loyalty trong thiết kế là các phân hệ database đã hoàn thiện.

## 3. Cấu trúc thư mục

```text
.
├── apps/
│   ├── api/
│   │   ├── src/                   # Auth, Users, Products, Orders, Payments, Health
│   │   │   └── database/          # TypeORM, 4 migration và lệnh migrate độc lập
│   │   ├── test/                  # Supertest HTTP và integration với PostgreSQL
│   │   └── Dockerfile
│   └── web/
│       ├── src/                   # App Router, components, providers và unit tests
│       ├── e2e/                   # Playwright cho luồng đặt và thanh toán đơn
│       ├── playwright.config.ts
│       └── Dockerfile
├── deploy/                        # Rollout Render, rollback, HTTPS smoke và tests
├── docs/                          # Requirements, UML, ADR và báo cáo Task 5.1–5.3
├── .github/workflows/
│   ├── ci.yml                     # Kiểm tra API, Web và tích hợp
│   └── release.yml                # Phát hành theo tag, publish GHCR và deploy
├── docker-compose.yml             # Web, API và PostgreSQL local
├── compose.db.yml                 # PostgreSQL riêng cho API chạy trực tiếp
├── compose.test-db.yml            # PostgreSQL riêng cho integration tests
└── .env.example                   # Mẫu cấu hình local
```

## 4. Chức năng và luồng đặt hàng

1. **Menu và chi tiết:** tải danh mục từ API, xem giá và chọn size/topping; xử lý trạng thái loading, rỗng, lỗi và thử lại.
2. **Giỏ hàng:** thêm sản phẩm theo biến thể, tăng/giảm số lượng, bỏ topping hoặc xóa món; lưu giỏ qua localStorage. Tổng trên giao diện là dự tính.
3. **Xác thực:** đăng ký tài khoản mới hoặc đăng nhập; các API được bảo vệ yêu cầu Bearer JWT. Backend lưu mật khẩu đã băm, không lưu mật khẩu thuần.
4. **Tạo đơn:** client gửi ID, tùy chọn và số lượng; backend kiểm tra dữ liệu, tính giá chuẩn và lưu đơn `PENDING` cùng các dòng sản phẩm.
5. **Thanh toán:** chọn Ví/Thẻ mô phỏng. Thành công chuyển đơn sang `PAID` và xóa giỏ; thất bại chuyển `PAYMENT_FAILED`, giữ giỏ để thử lại trên cùng đơn. `PAYMENT_DEMO_ENABLED=true` bật lựa chọn mô phỏng thất bại.
6. **Xác nhận và lịch sử:** xem mã đơn, tổng tiền, trạng thái và đơn của tài khoản hiện tại. Người dùng không được đọc hoặc thanh toán đơn của tài khoản khác.

Thanh toán yêu cầu header `Idempotency-Key`: cùng key và payload trả lại kết quả đã lưu; cùng key nhưng payload khác bị từ chối. Không cho thanh toán lại đơn đã `PAID` bằng key mới. Dữ liệu đơn/thanh toán tồn tại sau restart API; trạng thái đăng nhập trên trình duyệt được quản lý riêng với dữ liệu PostgreSQL.

### Các API chính

| Nhóm | Endpoint |
| --- | --- |
| Health | `GET /health` |
| Sản phẩm | `GET /products`, `GET /products/:id` |
| Xác thực | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Đơn hàng | `POST /orders`, `GET /orders/me`, `GET /orders/:id` |
| Thanh toán | `GET /payments/config`, `POST /payments` |

## 5. Chạy local

Các lệnh dưới đây dùng PowerShell. Cần Node.js 24, npm và Docker đang hoạt động. Mỗi ứng dụng có `package.json` và lockfile riêng; cài dependency trong đúng thư mục ứng dụng.

### 5.1. Cấu hình môi trường an toàn

Từ gốc repository, tạo file cấu hình local nếu chưa có:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

| Biến | Giá trị/cách cấu hình local |
| --- | --- |
| `PORT` | `3001` |
| `WEB_ORIGIN` | `http://localhost:3000` |
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `5434` |
| `DB_USER` | `brewlite_a2` |
| `DB_NAME` | `brewlite_assignment2` |
| `DB_PASSWORD` | Tự tạo mật khẩu ngẫu nhiên, chỉ lưu trong `.env` local; Compose bắt buộc biến này có giá trị |
| `JWT_SECRET` | Tự tạo secret ngẫu nhiên ít nhất 32 byte, chỉ lưu local |
| `PAYMENT_DEMO_ENABLED` | `true` để kiểm thử cả tình huống thanh toán mô phỏng thất bại |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001`; cấu hình cho Web trong `.env.local` như bên dưới |

`.env` và `.env.local` được Git ignore. Không commit hoặc đưa mật khẩu, secret, token vào README/log. Không đặt secret vào biến `NEXT_PUBLIC_*` vì các biến này được dùng phía trình duyệt.

Khi chạy từ `apps/api`, ConfigModule nạp `.env` ở gốc repository trước `.env` tại `apps/api`; biến môi trường tiến trình có thể ghi đè file. Next.js dùng API mặc định `http://localhost:3001`. Nếu muốn cấu hình tường minh, tạo `apps/web/.env.local` với duy nhất biến public cần thiết:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5.2. Khởi động PostgreSQL riêng cho Assignment 2

Từ gốc repository, sau khi điền `DB_PASSWORD`:

```powershell
docker compose -f compose.db.yml up -d --wait db
docker compose -f compose.db.yml ps
```

Cấu hình thực tế trong `compose.db.yml`:

- Project: `brewlite-assignment2-db`; service: `db`; image: `postgres:17`.
- Chỉ bind `127.0.0.1:5434` trên máy vào cổng `5432` trong container.
- Database/user: `brewlite_assignment2` / `brewlite_a2`.
- Volume bền vững: `brewlite_assignment2_pgdata`; healthcheck dùng `pg_isready`.

Dùng database riêng cho Assignment 2, không trỏ migration vào Assignment 1 hoặc production. Volume cũ giữ nguyên dữ liệu và thông tin khởi tạo PostgreSQL; đổi `DB_PASSWORD` trong `.env` không tự đổi mật khẩu role trong volume đã tồn tại. Không xóa volume để xử lý lỗi cấu hình.

Có thể dừng riêng database mà vẫn giữ dữ liệu:

```powershell
docker compose -f compose.db.yml stop db
```

### 5.3. Khởi động API NestJS

Mở terminal riêng tại gốc repository:

```powershell
Set-Location apps/api
npm ci
npm run start:dev
```

API mặc định tại `http://localhost:3001`. Khi khởi động, API kết nối PostgreSQL và tự áp dụng các migration còn thiếu trong bộ 4 migration; không cần lệnh migration npm riêng hoặc seed tài khoản. Các migration tạo/cập nhật `users`, `orders`, `order_items`, `payments` và bảng theo dõi `migrations`, bao gồm ràng buộc idempotency bền vững.

### 5.4. Khởi động Web Next.js

Mở terminal khác tại gốc repository:

```powershell
Set-Location apps/web
npm ci
npm run dev
```

Truy cập [BrewLite local](http://localhost:3000). Giữ cả PostgreSQL và API hoạt động để thử đầy đủ luồng đặt hàng; đăng ký tài khoản qua giao diện, không cần tài khoản mẫu hoặc reset database.

### 5.5. Chạy toàn bộ stack với Docker trên Windows

Mở Docker Desktop ở chế độ Linux containers. Từ gốc repository, tạo `.env` nếu chưa có.

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Điền `STACK_DB_PASSWORD` và `STACK_JWT_SECRET` trong `.env` local bằng hai giá trị ngẫu nhiên riêng. Dùng ít nhất 32 byte cho JWT secret. Giữ các giá trị này ổn định khi dùng lại volume. File `.env` được Git bỏ qua. Nếu cổng mặc định bận, chọn cổng trống bằng `STACK_WEB_PORT` và `STACK_API_PORT` trước khi build.

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Khi cả ba service có trạng thái `healthy`, mở [Web](http://localhost:3080) và kiểm tra [API](http://localhost:3081/products) cùng [health endpoint](http://localhost:3081/health).

```powershell
Invoke-RestMethod http://localhost:3081/health
Invoke-RestMethod http://localhost:3081/products
(Invoke-WebRequest http://localhost:3080).StatusCode
```

Project mặc định là `brewlite-assignment2-stack` với volume `brewlite-assignment2-stack_pgdata` riêng. PostgreSQL 17 chỉ có cổng nội bộ, API kết nối qua `db:5432`. NestJS áp dụng các migration còn thiếu khi khởi động, dựa trên bảng lịch sử migration. Web dùng URL API công khai của máy local, được đưa vào bundle qua `NEXT_PUBLIC_API_URL` lúc build. Nếu đổi cổng API, chạy lại `docker compose up -d --build` và dùng cổng mới trong các lệnh kiểm tra.

Dừng và chạy lại stack mà vẫn giữ dữ liệu:

```powershell
docker compose stop
docker compose up -d
```

Môi trường full-stack dùng các biến `STACK_*` và volume riêng. Cấu hình `compose.db.yml` và `compose.test-db.yml` phục vụ hai môi trường PostgreSQL khác.

Có thể lưu các biến `STACK_*` trong `.env.stack` riêng. Khi chọn cách này, dùng `docker compose --env-file .env.stack` cho mọi lệnh của stack, kể cả lúc dừng. `.env.stack` cũng được Git bỏ qua.

## 6. Tests, lint và build

Sau khi đã cài dependency, mở terminal tại gốc repository cho từng nhóm lệnh dưới đây. Nếu đang ở thư mục ứng dụng, chỉ chạy các lệnh `npm` tương ứng.

### API

```powershell
Set-Location apps/api
npm test -- --runInBand
npm run lint
npm run build
```

Kiểm thử HTTP Products có script riêng:

```powershell
npm run test:e2e -- --runInBand
```

Bộ HTTP Products dùng `ProductsModule` và chạy độc lập với PostgreSQL. Bộ `npm run test:integration` dùng `AppModule` với PostgreSQL test riêng tại `127.0.0.1:55432` qua `compose.test-db.yml` và biến `TEST_DB_PASSWORD`.

Đặt `TEST_DB_PASSWORD` trong môi trường terminal với mật khẩu riêng của PostgreSQL integration. Nếu volume đã tồn tại, dùng đúng mật khẩu đã cấu hình khi tạo volume. Từ gốc repository, chạy:

```powershell
docker compose -f compose.test-db.yml up -d --wait db
Set-Location apps/api
npm run test:integration
```

TypeORM áp dụng các migration còn thiếu trên database đích khi API khởi động. Menu mẫu có sẵn trong catalog backend. Để tạo dữ liệu demo, đăng ký tài khoản mới và đặt một đơn thanh toán mô phỏng qua Web. Integration và E2E tự tạo tài khoản ngẫu nhiên cho từng lượt kiểm thử. Xem [báo cáo nghiệm thu Task 5.2](docs/task5.2-report.md) để biết kết quả và giới hạn kiểm chứng.

### Web

```powershell
Set-Location apps/web
npm test -- --run
npm run lint
npm run build
```

### Kết quả kiểm thử đã ghi nhận

| Kiểm tra | Kết quả | Bằng chứng |
| --- | --- | --- |
| API unit tests | **60/60 PASS** | Nghiệm thu Task 5.3 |
| Web unit/component tests | **38/38 PASS** | Nghiệm thu Task 5.3 |
| API và Web lint/build | **PASS** | Nghiệm thu local Task 5.3 |
| API HTTP Products | **3/3 PASS** | Supertest local |
| API integration | **15/15 PASS** | PostgreSQL tách biệt, dùng DB thật |
| Playwright E2E | **1 kịch bản đặt hàng** | [Task 5.2](docs/task5.2-report.md) ghi **2/2 lượt lặp PASS**. [Task 5.3](docs/task5.3-report.md) ghi **1 lượt PASS** trên Chrome/Windows với Docker Compose local. |
| Automatic Rollback và smoke | **32/32 PASS** | Render giả lập và HTTP loopback |

Các số liệu lấy từ [báo cáo Task 5.3](docs/task5.3-report.md). Có thể chạy lại bộ kiểm thử rollback và smoke từ gốc repository:

```powershell
node --test deploy/release.test.mjs deploy/smoke.test.mjs
```

### E2E trên Chromium (Windows)

Từ gốc repository, dùng cùng file env như khi cấu hình Docker Compose và giữ cổng mặc định Web `3080`, API `3081`. Ví dụ dưới đây dùng `.env` mặc định. Nếu dùng `.env.stack`, thêm `--env-file .env.stack` sau `docker compose`.

```powershell
docker compose up -d --build --wait
Set-Location apps/web
npm ci
npx playwright install chromium --only-shell
npm run test:e2e -- --project=chromium
```

Nếu Chromium Headless Shell tải riêng không khởi động trên Windows, dùng Google Chrome đã cài trên máy trong cùng terminal:

```powershell
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = 'chrome'
npm run test:e2e -- --project=chromium
```

Mỗi lượt dùng browser context và tài khoản mới, gọi trực tiếp Web/API của stack và lưu đơn thanh toán mô phỏng trong PostgreSQL của stack. Dữ liệu test được giữ lại để tránh thao tác xóa hoặc reset. Chạy lại lệnh test để kiểm tra tính lặp lại.

## 7. Nghiệm thu Task 5.1 trên PostgreSQL thực tế

Nguồn: phần **“Kết quả nghiệm thu PostgreSQL thực tế — 14/11/2026”** ở đầu [docs/task5.1-report.md](docs/task5.1-report.md). Các kết luận NOT VERIFIED trong phần lịch sử bên dưới đã được kết quả mới thay thế.

| Hạng mục | Kết quả được báo cáo |
| --- | --- |
| PostgreSQL | **PASS** – container healthy, kết nối đúng database/user qua cổng 5434 và volume riêng |
| 4 migration | **PASS** – áp dụng trên schema sạch, đủ bảng và unique index idempotency |
| Register/Login | **PASS** – lưu tài khoản thật, kiểm tra bcrypt/JWT, lỗi email trùng/sai mật khẩu; thao tác UI thành công |
| Orders | **PASS** – lưu đơn `PENDING` và OrderItem; tổng do server tính; kiểm tra JWT và dữ liệu không hợp lệ |
| Mock Payment | **PASS** – Ví/Thẻ thành công/thất bại, thử lại cùng đơn; thất bại giữ giỏ, thành công xóa giỏ |
| Ownership | **PASS** – tài khoản khác không đọc/thanh toán được đơn và không thấy trong lịch sử |
| Idempotency | **PASS** – replay không tạo payment trùng; thiếu key, payload xung đột và thanh toán lại đơn PAID bị từ chối |
| History sau restart | **PASS** – snapshot dữ liệu khớp trước/sau restart; đăng nhập lại vẫn xem được đơn PAID cũ |

Kết quả trên thuộc phạm vi nghiệm thu local của Task 5.1. Bằng chứng production được ghi riêng trong phần CI/CD bên dưới.

## 8. Production và CI/CD

| Dịch vụ | URL |
| --- | --- |
| Web Next.js trên Render | [BrewLite Web](https://brewlite-web-gfr9.onrender.com) |
| API NestJS trên Render | [BrewLite API](https://brewlite-api-2u7z.onrender.com) |
| API health | [GET /health](https://brewlite-api-2u7z.onrender.com/health) |

GitHub Actions build hai Docker image `linux/amd64` và publish lên GHCR. Render chạy Web và API theo digest. Trình duyệt gọi API qua HTTPS bằng `NEXT_PUBLIC_API_URL` được nhúng lúc build Web. API kết nối PostgreSQL trên Neon qua TLS. Hướng dẫn cấu hình dịch vụ và quyền truy cập nằm trong [báo cáo Task 5.3](docs/task5.3-report.md#thiết-lập-thủ-công).

### CI và phát hành

- [CI](.github/workflows/ci.yml) chạy khi mở hoặc cập nhật PR vào `main`, khi push lên `main` và khi được release gọi. CI chạy lint, unit tests, build, HTTP Products, integration với PostgreSQL riêng, kiểm tra migration, kiểm thử rollback/smoke giả lập và E2E Chromium trên stack tạm.
- [Release](.github/workflows/release.yml) chạy khi push tag `vMAJOR.MINOR.PATCH` trỏ tới commit thuộc lịch sử `origin/main`. Quality phải thành công trước khi Publish build và đẩy hai image lên GHCR. Artifact `candidate` ghi cặp digest cùng revision của bản phát hành.
- Để phát hành, người phụ trách chọn commit đã qua CI trên `main`, tạo tag SemVer mới và push riêng tag đó. Chỉ khi biến repository `PROD_DEPLOY_ENABLED=true`, job Deploy mới chạy trong GitHub Environment `production`. Với cấu hình hiện tại là `false`, release dừng sau Publish. `PROD_API_URL` là biến repository dùng khi build Web. `PROD_WEB_URL` thuộc Environment `production`.
- **Migration local** chạy khi NestJS khởi động và chỉ áp dụng migration còn thiếu. **Migration production** chạy trước rollout qua `node dist/database/migrate.js` từ đúng API image của candidate, dùng kết nối Neon trực tiếp qua TLS và advisory lock. API trên Render dùng `DB_MIGRATIONS_RUN=false`. Workflow triển khai API rồi Web theo digest, chạy smoke HTTPS và lưu `stable-*` khi thành công.

### Bằng chứng nghiệm thu

| Lượt kiểm chứng | Kết quả |
| --- | --- |
| CI sau merge PR #20 vào `main` | **PASS** tại commit `ec1645da7e739ee50376e6229b8e8b4174c57376` |
| Release `v1.0.1`, workflow #2 | Quality API, Quality Web và Publish Docker Images **PASS**, có artifact `candidate`. Deploy **SKIPPED** vì `PROD_DEPLOY_ENABLED=false` |
| Phiên bản production ổn định trước đó | Web/API chạy trên Render, kết nối Neon, áp dụng 4 migration và smoke HTTPS **PASS**. Đã đối chiếu GHCR Image Index với manifest `linux/amd64` của Render cho cả API và Web |

### Rollback và khôi phục thủ công

Trước rollout, workflow xác minh bản ổn định và lưu `rollback-*` với digest API/Web và revision. Khi deploy hoặc smoke thất bại, workflow khôi phục theo digest ổn định cho dịch vụ đã thử deploy. Với dịch vụ còn lại, workflow kiểm tra trạng thái trên Render trước khi ghi nhận `unchanged`. Sau đó workflow chạy smoke với revision ổn định và ghi kết quả vào `rollout-result-*`. Release vẫn báo FAIL kể cả khi rollback thành công.

Nếu rollback không hoàn chỉnh, giữ deploy tắt, kiểm tra deployment đang chờ trên Render và xác nhận schema còn tương thích với bản ổn định. Dùng đúng digest trong `rollback-*` để khôi phục, xác minh từng dịch vụ đang `live` và chạy lại smoke cho revision ổn định. Rollback ứng dụng giữ nguyên các migration đã áp dụng. Xem [quy trình migration, rollback và khôi phục thủ công](docs/task5.3-report.md#migration-smoke-và-rollback).

Automatic Rollback đạt **32/32 test local PASS**. Khôi phục sau một deployment thất bại thực tế trên Render **chưa được kiểm thử**.
