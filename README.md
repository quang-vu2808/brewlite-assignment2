# BrewLite – Assignment 2

BrewLite là đồ án học phần **Công nghệ phần mềm – Trường Đại học Sài Gòn**, xây dựng ứng dụng đặt và thanh toán đồ uống mô phỏng. Assignment 2 bao gồm phân tích yêu cầu, mô hình UML, thiết kế kiến trúc, ứng dụng Web/API, kiểm tra liên tục và MVP khách hàng.

Luồng hiện có: **Menu → Chi tiết sản phẩm → Giỏ hàng → Đăng ký/Đăng nhập → Tạo đơn → Thanh toán mô phỏng → Xác nhận → Lịch sử đơn hàng**. Hệ thống không thu tiền thật.

## 1. Phạm vi và tiến độ

| Task | Nội dung và tài liệu thực tế | Trạng thái được ghi nhận |
|---|---|---|
| 1 | [Bối cảnh và phạm vi](docs/requirements/context-and-scope.md), [SRS](docs/requirements/srs.md), [đặc tả UC-18](docs/requirements/use-case-checkout.md) | Có tài liệu phân tích; một số quyết định nghiệp vụ vẫn là dự thảo/chờ nhóm xác nhận, không đồng nghĩa mọi yêu cầu đã được lập trình |
| 2 | [Các sơ đồ UML](docs/diagrams/): Use Case, Activity, Sequence, Class; có nguồn PlantUML và ảnh PNG, gồm các bản tập trung vào checkout/domain | Có mô hình trong repository; không tự coi tất cả mô hình đã được duyệt hoặc hiện thực đầy đủ |
| 3 | [Kiến trúc](docs/architecture/architecture.md), [ADR](docs/architecture/adr/), [thiết kế triển khai](docs/requirements/deployment.md), [Deployment Diagram](docs/architecture/deployment.puml) | Có thiết kế phân lớp/modular monolith và triển khai đề xuất; các ADR đang Proposed, không phải bằng chứng đã triển khai production |
| 4.1 | Có cấu trúc repository, tài liệu và hai ứng dụng trong `apps/` | Chưa có đặc tả Task 4.1 hoặc bằng chứng nghiệm thu riêng trong repository để đối chiếu đầy đủ; chưa kết luận hoàn thành |
| 4.2 | Có mã nguồn, cấu hình và kiểm thử API/Web | Chưa có đặc tả Task 4.2 hoặc bằng chứng nghiệm thu riêng trong repository để đối chiếu đầy đủ; chưa kết luận hoàn thành |
| 4.3 | `apps/api` và `apps/web`: API sản phẩm, menu và các trạng thái tải/rỗng/lỗi/thử lại | Đã có mã nguồn và kiểm thử; tiếp tục được tích hợp với MVP |
| 4.4 | [GitHub Actions CI](.github/workflows/ci.yml) cho API và Web | Có workflow lint, unit tests, build trên pull request vào `main`; trạng thái từng lượt chạy cần xem trên GitHub |
| 5.1 | MVP khách hàng, lưu dữ liệu PostgreSQL, xác thực, đơn hàng và thanh toán mô phỏng | Đã nghiệm thu chức năng bắt buộc trong môi trường local theo [báo cáo Task 5.1](docs/task5.1-report.md), ngày 14/11/2026 |

Task 5.2 có health endpoint, integration tests PostgreSQL, cấu hình Docker Compose cho Web, API và PostgreSQL local, cùng Playwright E2E cho luồng từ Menu đến lịch sử đơn đã thanh toán. GHCR, CD và triển khai production thuộc phạm vi riêng.

## 2. Công nghệ và kiến trúc hiện tại

- **Web:** Next.js 16, React 19, TypeScript; App Router và các context provider cho Auth, Cart, Checkout. Kiểm thử bằng Vitest, Testing Library và jsdom; lint bằng ESLint.
- **API:** NestJS 12, TypeScript, REST; DTO với class-validator/class-transformer; xác thực JWT và băm mật khẩu bằng bcrypt. Kiểm thử bằng Jest/Supertest; lint bằng Oxlint có kiểm tra kiểu.
- **Dữ liệu:** PostgreSQL 17, TypeORM và migration có phiên bản. `synchronize: false`, `migrationsRun: true`: API tự áp dụng migration còn thiếu khi khởi động.
- **Môi trường:** Node.js 24, npm, Docker Engine/Docker Desktop và Docker Compose cho database; GitHub Actions cho CI.

Trình duyệt gọi NestJS qua HTTP/JSON. Backend quyết định giá, tổng tiền, quyền sở hữu đơn và kết quả thanh toán. Danh mục sản phẩm mẫu và metadata size/topping hiện nằm trong mã backend; PostgreSQL lưu người dùng, đơn hàng, dòng sản phẩm trong đơn và thanh toán. Không mô tả sản phẩm, khuyến mãi, tồn kho hay loyalty trong thiết kế là các phân hệ database đã hoàn thiện.

## 3. Cấu trúc thư mục

```text
.
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── auth/                # Đăng ký, đăng nhập, JWT
│   │   │   ├── users/               # Entity người dùng
│   │   │   ├── products/            # Danh mục và tùy chọn sản phẩm
│   │   │   ├── orders/              # Tạo đơn, chi tiết, lịch sử
│   │   │   ├── payments/            # Thanh toán mô phỏng, idempotency
│   │   │   └── database/migrations/ # 4 migration
│   │   └── test/                    # Kiểm thử HTTP Products
│   └── web/
│       └── src/
│           ├── app/                # Menu, products, cart, auth, checkout, orders
│           ├── components/         # Header, providers và thành phần dùng chung
│           └── lib/                # Kiểu dữ liệu và tiện ích
├── docs/
│   ├── requirements/               # Phạm vi, SRS, UC-18, thiết kế triển khai
│   ├── diagrams/                   # UML: nguồn .puml và ảnh .png
│   ├── architecture/               # Kiến trúc, ADR, Deployment Diagram
│   └── task5.1-report.md            # Nghiệm thu hiện tại và lịch sử kiểm chứng
├── .github/workflows/ci.yml
├── compose.db.yml                  # Chỉ PostgreSQL Assignment 2
└── .env.example                    # Mẫu cấu hình, không chứa secret
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
|---|---|
| Sản phẩm | `GET /products`, `GET /products/:id` |
| Xác thực | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Đơn hàng | `POST /orders`, `GET /orders/me`, `GET /orders/:id` |
| Thanh toán | `GET /payments/config`, `POST /payments` |

## 5. Chạy local

Các lệnh dưới đây dùng PowerShell. Cần Node.js 24, npm và Docker đang hoạt động. Mỗi ứng dụng có `package.json` và lockfile riêng; cài dependency trong đúng thư mục ứng dụng.

### 5.1. Cấu hình môi trường an toàn


| Biến | Giá trị/cách cấu hình local |
|---|---|
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

API mặc định tại `http://localhost:3001`. Khi khởi động, API kết nối PostgreSQL và tự chạy 4 migration còn thiếu; không cần lệnh migration npm riêng hoặc seed tài khoản. Các migration tạo/cập nhật `users`, `orders`, `order_items`, `payments` và bảng theo dõi `migrations`, bao gồm ràng buộc idempotency bền vững.

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

### Kết quả đã ghi nhận và giới hạn bằng chứng

| Nhóm kiểm tra | Kết quả | Phạm vi bằng chứng |
|---|---|---|
| API unit tests | **56/56 PASS, 9/9 suites** | Kết quả mới nhất trên `feature/task-5.1-mvp` do người thực hiện cung cấp |
| API lint | **0 warnings, 0 errors** | Kết quả mới nhất do người thực hiện cung cấp |
| API build | **PASS** | Kết quả mới nhất do người thực hiện cung cấp |
| Web unit/component tests | **38/38 PASS, 11/11 files** | Kết quả toàn bộ Web tests sau khi cung cấp CartProvider/AuthProvider cho test Menu |
| Web lint/build | **PASS** | Đã kiểm tra trong workspace PR |

Các số liệu unit/component tests không thay thế kiểm thử giao dịch và lưu trữ trên PostgreSQL. Lượt cập nhật README chỉ đối chiếu bằng chứng, không chạy lại các bộ kiểm tra.

### E2E trên Chromium (Windows)

Từ gốc repository, khởi động stack với cấu hình `.env.stack` local và giữ cổng mặc định Web `3080`, API `3081` để chạy kịch bản này.

```powershell
docker compose --env-file .env.stack -p brewlite-assignment2-stack up -d --build --wait
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
|---|---|
| PostgreSQL | **PASS** – container healthy, kết nối đúng database/user qua cổng 5434 và volume riêng |
| 4 migration | **PASS** – áp dụng trên schema sạch, đủ bảng và unique index idempotency |
| Register/Login | **PASS** – lưu tài khoản thật, kiểm tra bcrypt/JWT, lỗi email trùng/sai mật khẩu; thao tác UI thành công |
| Orders | **PASS** – lưu đơn `PENDING` và OrderItem; tổng do server tính; kiểm tra JWT và dữ liệu không hợp lệ |
| Mock Payment | **PASS** – Ví/Thẻ thành công/thất bại, thử lại cùng đơn; thất bại giữ giỏ, thành công xóa giỏ |
| Ownership | **PASS** – tài khoản khác không đọc/thanh toán được đơn và không thấy trong lịch sử |
| Idempotency | **PASS** – replay không tạo payment trùng; thiếu key, payload xung đột và thanh toán lại đơn PAID bị từ chối |
| History sau restart | **PASS** – snapshot dữ liệu khớp trước/sau restart; đăng nhập lại vẫn xem được đơn PAID cũ |

Đây là nghiệm thu local theo các kịch bản trong báo cáo, không phải chứng nhận production hoặc xác nhận toàn bộ yêu cầu mở rộng đã hoàn thành. Những nội dung như khuyến mãi, loyalty đầy đủ, quản lý tồn kho/optimistic locking, PWA và triển khai production cần đối chiếu, triển khai và nghiệm thu riêng theo phạm vi các Task tiếp theo.

## 8. CI Task 4.4

Workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) chạy trên sự kiện pull request `opened`, `reopened`, `synchronize` vào `main`, gồm hai job độc lập trên Ubuntu với Node.js 24:

- **API CI:** `npm ci` → lint → unit tests (`--runInBand`) → build.
- **Web CI:** `npm ci` → lint → Vitest (`--run`) → build; cấu hình URL API public cho build.

Workflow không khởi động PostgreSQL, không chạy `test:e2e`, không chạy nghiệm thu database, không build/push Docker image và không deploy. Việc có file workflow không chứng minh mọi lần chạy trên GitHub đều xanh; cần xem kết quả của pull request tương ứng.
