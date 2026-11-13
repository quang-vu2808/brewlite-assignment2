# BrewLite Assignment 2 – Báo cáo Task 5.1

## Kết quả nghiệm thu PostgreSQL thực tế — 14/11/2026

**Task 5.1 đã hoàn thành kiểm chứng chức năng bắt buộc trong môi trường local Assignment 2.** Các mục NOT VERIFIED do chưa có PostgreSQL trong những lần trước đã được kiểm tra thực tế ở lượt này. Những phần phía dưới mục “Lịch sử các lượt trước” được giữ để tra cứu và không phải trạng thái nghiệm thu hiện tại. Kết quả unit/component/lint/build PASS trước đó được giữ nguyên; lượt này không chạy lại các bộ kiểm tra đó hoặc triển khai Task 5.2–5.4.

### Phạm vi và xác nhận trước khi chạy

- Script đã chạy: `C:/Users/ADMIN/.codex/visualizations/2026/11/12/01a1ced7-997a-7661-b1cf-39b331aa4030/task51-db-verifier.cjs`; `node --check` PASS, SHA256 trước và sau chạy không đổi: `0346EF0D5198AED34644805986632A35A4106B8DAF0357A57F96E8DA50F80FFA`.
- Chỉ tạo/khởi động PostgreSQL bằng Compose project `brewlite-assignment2-db`, container `brewlite-assignment2-db-db-1`, image PostgreSQL 17.11, database `brewlite_assignment2`, user `brewlite_a2`, kết nối `127.0.0.1:5434`, volume `brewlite_assignment2_pgdata`.
- Trước startup: project/volume đích chưa tồn tại, cổng kiểm chứng trống; Compose được xác nhận chỉ có service db và đúng thông số trên. Sau startup, kết nối trực tiếp qua cổng 5434 xác nhận đúng current_database/current_user và schema public không có bảng. Chỉ sau kiểm tra sạch này mới khởi động NestJS để áp dụng migration.
- Không xóa/reset dữ liệu, không dùng database Assignment 1/production. Không in DB_PASSWORD/JWT_SECRET. Không thực hiện Git ghi.

### Kết quả thực tế

| Hạng mục | PASS/FAIL/NOT VERIFIED | Bằng chứng |
|---|---|---|
| PostgreSQL healthy | PASS | Container Assignment 2 healthy; PostgreSQL 17.11 kết nối đúng DB/user qua 127.0.0.1:5434, mount đúng volume riêng |
| Migration | PASS | Áp dụng đủ 4 migration trên schema sạch; có đúng 5 bảng migrations/users/orders/order_items/payments; index UNIQUE UQ_payments_user_idempotency_key tồn tại |
| Register/Login | PASS | Hai tài khoản API lưu thật, bcrypt.compare đúng với password_hash; email trùng trả 409, sai password 401, JWT gọi /auth/me đúng user; đăng ký/đăng nhập thêm tài khoản qua UI thành công |
| Create Order | PASS | Đơn c0467c47-a7f5-42ae-b6b9-4ec4f2c51682 ban đầu PENDING, lưu 2 OrderItem, tổng backend 118.000 ₫; thiếu JWT 401, size sai 400, gửi giá từ client 400, sản phẩm không tồn tại 404 |
| Mock Payment | PASS | Ví thành công → PAID; Ví thất bại → PAYMENT_FAILED; Thẻ FAILED rồi SUCCESS trên cùng đơn, record lưu đúng; UI thất bại giữ giỏ 2 sản phẩm, thử lại thành công cùng mã đơn và giỏ về 0 |
| Ownership | PASS | User B đọc/thanh toán đơn của user A đều nhận 404; lịch sử user B rỗng |
| Idempotency | PASS | Thiếu key trả 400; lặp cùng key/body trả cùng response, database chỉ có 1 payment cho đơn đó; đổi payload cùng key hoặc dùng key mới cho đơn PAID trả 409 |
| History sau restart | PASS | Snapshot trước/sau restart có cùng số record và SHA256; tải lại frontend, đăng nhập lại tài khoản cũ vẫn thấy đúng mã đơn 57c93ea7-7684-4910-9703-89204632cd51, PAID, 80.000 ₫ |
| Assignment 1 giữ nguyên | PASS | So sánh cả 4 container: ID, startedAt, restart count, status, health và mounts khớp baseline; không chạy lệnh ghi lên Assignment 1 |
| Bảo vệ secret/source/config | PASS | .env bị Git ignore; quét Git candidates không có DB_PASSWORD/JWT_SECRET; đối chiếu SHA256 127 file trước khi sửa báo cáo: không file nào thay đổi hoặc bị xóa |

Các migration đã thực thi: `CreateOrders1710000000000`, `AddUsersAndOrderOwner1710000001000`, `CreatePayments1710000002000`, `MvpPaymentIdempotency1710000003000`.

Dữ liệu kiểm chứng được giữ nguyên: **3 users, 4 orders, 5 order_items, 6 payments**. Snapshot dữ liệu nghiệp vụ trước/sau restart có cùng digest `2c77b8082d403dbc75ed98cf6802801add303702b80a3da20e71055a5101e544`. Digest này bao phủ các trường nghiệp vụ được helper chọn; không xuất password_hash, password hoặc token.

Luồng UI đã chạy: Menu → chi tiết Cà phê sữa → size L + Trân châu (40.000 ₫) → giỏ số lượng 2 (80.000 ₫) → đăng ký/đăng nhập → tạo đơn → Ví mô phỏng thất bại → thử lại thành công → lịch sử đơn. Sau reload, phiên xác thực trong bộ nhớ cần đăng nhập lại; dữ liệu tài khoản và lịch sử đơn trong PostgreSQL vẫn còn.

### Điều chỉnh cách chạy kiểm chứng và trạng thái kết thúc

Kênh stdin của helper ban đầu không nhận được lệnh tương tác restart/finish. Đồng thời phát hiện tiến trình NestJS watch Assignment 2 có sẵn đã phục vụ API thay cho PID khởi động ban đầu của helper. Không chạy lại helper khởi tạo vì database đã có dữ liệu.

Phần tiếp nối `task51-db-continuation.cjs` được tạo ngoài repository, kiểm tra cú pháp PASS và chạy sau khi được cấp quyền. Phần này xác nhận lại DB/container/schema/migrations hiện có, đối chiếu baseline Assignment 1, xác minh PID 37452 có đường dẫn chính xác tới `apps/api/dist/main` của Assignment 2 trước khi dừng riêng tiến trình backend đó, rồi khởi động backend kiểm chứng riêng. Không tạo lại database, không chạy lệnh migration bổ sung, không sửa source/config. Sau đó đối chiếu snapshot dữ liệu và kiểm tra UI bằng đăng nhập lại.

Sau kiểm chứng, đã dừng backend kiểm chứng, Next.js và helper do lượt kiểm chứng sử dụng. Không dừng/xóa container PostgreSQL Assignment 2; database và volume được giữ lại. Tiến trình Nest watch có sẵn không bị xóa hoặc thay cấu hình; có thể cần khởi động lại API khi tiếp tục phát triển. Bốn container Assignment 1 không bị dừng/restart/thay đổi.

### File thực sự thay đổi/tạo trong lượt kiểm chứng này

Thư mục artifact ngoài repository: `C:/Users/ADMIN/.codex/visualizations/2026/11/12/01a1ced7-997a-7661-b1cf-39b331aa4030/`.

| File | Thao tác | Mục đích |
|---|---|---|
| `docs/task5.1-report.md` | Chỉnh sửa duy nhất trong repository | Ghi kết quả PostgreSQL/API/UI/restart thực tế; giữ lịch sử các lượt trước |
| `task51-db-continuation.cjs` trong artifact | Tạo mới | Tiếp nối restart/đối chiếu/dọn tiến trình sau khi stdin helper ban đầu đóng |
| `task51-postgres-evidence-2026-11-13T17-22-22-891Z-0620ac0d-ba94-4544-915c-9a91c939a578-001.json` trong artifact | Tạo mới, exclusive | Bằng chứng preflight, DB sạch, migration, auth, order, ownership, payment/idempotency |
| `task51-postgres-evidence-2026-11-13T17-45-08-066Z-8872342a-ebe9-47d5-b27c-17a2c7d8b502-001.json` trong artifact | Tạo mới, exclusive | Snapshot trước/sau restart |
| `task51-postgres-evidence-2026-11-13T17-45-08-066Z-8872342a-ebe9-47d5-b27c-17a2c7d8b502-002.json` trong artifact | Tạo mới, exclusive | Bằng chứng cuối: restart, A1 không đổi, secret hygiene, số record và kết quả UI |
| `task51-history-after-restart-1794591950211.jpg` trong artifact | Tạo mới, exclusive | Ảnh lịch sử đơn PAID sau restart và đăng nhập lại |

Không sửa `task51-db-verifier.cjs` đã được review; không sửa source API/UI, migrations, tests, workflow, Compose hoặc .env trong lượt này. Không có lỗi nghiệp vụ cần sửa qua các kiểm tra đã chạy. Có thể chuẩn bị commit/PR Task 5.1 sau khi người dùng tự kiểm tra diff; không đưa .env hoặc credentials vào Git.

## Lịch sử các lượt trước — không phải trạng thái hiện tại

> Các kết luận “chưa hoàn thành” và NOT VERIFIED dưới đây phản ánh môi trường tại thời điểm các lượt trước. Kết quả nghiệm thu PostgreSQL thực tế ở đầu tài liệu thay thế các kết luận đó.



## Cập nhật Docker PostgreSQL Assignment 2 — 14/11/2026

Người dùng đã cho phép tạo môi trường PostgreSQL Docker riêng cho Assignment 2 và sau đó chọn **tạo mật khẩu ngẫu nhiên, lưu vào `.env` local được gitignore**. Cấu hình đã được tạo và kiểm tra. Tuy nhiên, lệnh chạy quy trình tạo container/migration/API verification ngoài sandbox bị từ chối ở hộp xác nhận (`rejected by user`); tiến trình chưa được tạo. Vì vậy **chưa khởi động container Assignment 2, chưa chạy migration và chưa kiểm chứng Task 5.1 bằng database thật**.

Phần này thay thế kết luận về môi trường hiện tại trong bản kiểm tra PostgreSQL native ngày 13/11 bên dưới: PostgreSQL 17 thực tế có sẵn trong Docker của Assignment 1, nhưng các database đó không được sử dụng cho Task 5.1.

### Inventory và cấu hình đã xác minh

- Workspace đúng remote `quang-vu2808/brewlite-assignment2`, vẫn ở `main` với các thay đổi chưa commit được giữ nguyên.
- Docker Engine `29.9.2` hoạt động; Docker Compose `v5.6.1`. Kiểm tra Engine chỉ đọc đã được cấp quyền ngoài sandbox.
- Assignment 1 có `brewlite-web-1` (127.0.0.1:3002), `brewlite-api-1` (127.0.0.1:3003), `brewlite-db-1` (127.0.0.1:5433), `brewlite-postgres` (127.0.0.1:5432); cả bốn healthy ở lần inventory.
- Volume hiện có: `brewlite_brewlite_pgdata`, `brewlite_task9_pgdata`. Chưa có `brewlite_assignment2_pgdata`; chưa có container thuộc project `brewlite-assignment2-db`. Không thấy cổng 5434/3000/3001 đang được dùng ở lần kiểm tra.
- `compose.db.yml` chỉ khai báo một service `db`, image `postgres:17`, project `brewlite-assignment2-db`, mapping `127.0.0.1:5434:5432`, volume chính xác `brewlite_assignment2_pgdata`, restart `unless-stopped`, healthcheck `pg_isready`.
- Password Compose lấy từ `${DB_PASSWORD:?...}` và bắt buộc có giá trị. Không có password mặc định. Không dùng volume hoặc container Assignment 1.
- `.env` local đã tạo với DB_HOST=127.0.0.1, DB_PORT=5434, DB_USER=brewlite_a2, DB_NAME=brewlite_assignment2, PORT=3001, WEB_ORIGIN=http://localhost:3000, PAYMENT_DEMO_ENABLED=true. DB_PASSWORD và JWT_SECRET được sinh bằng crypto và không in ra output/báo cáo.
- ConfigModule nạp `.env` root khi API chạy từ `apps/api`; giá trị process env có ưu tiên. `.env.example` đã đổi host/port/user cho cấu hình Docker này. Chưa chạy backend vì `migrationsRun=true`.
- Kiểm tra `docker compose ... config --format json` chỉ đọc cấu hình, không truy cập Engine; JSON có secret được giữ trong bộ nhớ và chỉ xuất bản tóm tắt đã loại secret. Tên project, service, image, env, port, volume, healthcheck đều đạt assertion.
- `git check-ignore .env` đạt. Quét các file tracked/unignored không thấy DB_PASSWORD hoặc JWT_SECRET vừa tạo; `.env` không nằm trong danh sách file có thể được Git thêm mặc định.

### Kết quả xác minh hiện tại

| Hạng mục | PASS/FAIL/NOT VERIFIED | Bằng chứng |
|---|---|---|
| Docker Engine hoạt động | PASS | Server version 29.9.2 và inventory container đọc được |
| Preflight project/volume/port | PASS | Target project/volume chưa tồn tại; port 5434 chưa dùng ở thời điểm kiểm tra; phải kiểm tra lại trước startup |
| Compose tách biệt Assignment 2 | PASS | `config --format json` và assertions đạt; chỉ service db, đúng project/port/volume |
| Local env và bảo vệ secret | PASS | Secret ngẫu nhiên chỉ ở .env ignored; không có trong Git candidates hoặc output báo cáo |
| PostgreSQL Assignment 2 healthy và port 5434 kết nối được | NOT VERIFIED | Lệnh startup ngoài sandbox bị từ chối; chưa có target container được tạo bởi lượt này |
| Database/user/schema sạch trước migration | NOT VERIFIED | Chưa có kết nối tới PostgreSQL Assignment 2 |
| Migration tạo bảng/index thành công trên PostgreSQL 17 | NOT VERIFIED | Chưa chạy migration; đọc SQL/entity không phát hiện lỗi tĩnh |
| Register/Login/JWT với DB thật | NOT VERIFIED | Chưa chạy API với PostgreSQL Assignment 2 |
| Order PENDING và OrderItem lưu thật | NOT VERIFIED | Chưa kiểm chứng transaction thực tế |
| Wallet/Card success/failure, ownership, replay Idempotency-Key | NOT VERIFIED | Chưa kiểm tra trên database thật |
| Frontend cart/checkout và history sau refresh/restart API | NOT VERIFIED | Chưa khởi động API/web cho lượt kiểm chứng này |
| Assignment 1 không bị thao tác thay đổi | PASS | Chỉ inventory đọc; không chạy stop/restart/remove/migration trên các container/database/volume Assignment 1 |

### Quy trình đã chuẩn bị, chưa được chạy

Helper kiểm chứng một lần nằm ngoài repository: `C:\Users\ADMIN\.codex\visualizations\2026\11\12\01a1ced7-997a-7661-b1cf-39b331aa4030\task51-db-verifier.cjs`. Helper không chứa secret cố định, đọc `.env` khi chạy, và dừng nếu phát hiện project/volume/port xung đột.

Sau khi được cho phép chạy Docker ngoài sandbox, helper sẽ:

1. Lưu metadata an toàn của bốn container Assignment 1; kiểm tra lại target/port/volume và Compose trước khi tạo mới.
2. Khởi động riêng service db Assignment 2 bằng Compose, chờ healthy; không dùng `down -v`, volume rm hoặc prune.
3. Kết nối bằng đúng thông tin Assignment 2 ở 127.0.0.1:5434, xác nhận PostgreSQL 17, current_database/current_user và không có bảng public bất ngờ. Nếu có bảng bất ngờ thì dừng trước khi chạy NestJS.
4. Chạy NestJS Assignment 2 từ build có sẵn để áp dụng 4 migrations. Kiểm tra users/orders/order_items/payments/migrations và unique index payment idempotency.
5. Thử hai tài khoản local: register/login/hash/JWT, DTO errors, tạo đơn với giá server, ownership, Wallet/Card success/failure, idempotency replay/conflict và số record Payment thực tế.
6. Chạy Next.js local để kiểm tra thêm luồng UI, giỏ hàng và refresh. Chỉ restart tiến trình NestJS do helper tạo, đối chiếu các record/history sau restart.
7. Đối chiếu metadata container Assignment 1 với baseline, quét secret và xuất bằng chứng đã loại credentials. Giữ PostgreSQL Assignment 2; không reset/xóa dữ liệu kiểm thử.

Helper chưa được thực thi nên các assertion trong helper **không được tính là test PASS**. Unit/component/lint/build đạt ở lượt trước vẫn là bằng chứng riêng, không thay thế PostgreSQL thực.

### File thay đổi trong lượt Docker này

| File | Tạo mới/Chỉnh sửa | Mục đích |
|---|---|---|
| `compose.db.yml` | Tạo mới | Compose PostgreSQL 17 độc lập, chỉ bind loopback port 5434 và volume riêng |
| `.env.example` | Chỉnh sửa | Đổi mẫu DB_HOST/DB_PORT/DB_USER thành 127.0.0.1/5434/brewlite_a2; password và JWT vẫn để trống |
| `.env` (ignored, không đưa vào Git) | Tạo mới | Chứa cấu hình local, DB password và JWT secret ngẫu nhiên đã được người dùng cho phép |
| `docs/task5.1-report.md` | Chỉnh sửa | Ghi inventory Docker, cấu hình đã kiểm tra và các bước bị chặn |
| Helper ngoài repo `task51-db-verifier.cjs` ở đường dẫn trên | Tạo mới | Quy trình kiểm chứng một lần, đã chuẩn bị để review nhưng chưa chạy |

Không sửa source API/UI, migration, test hoặc CI; không cài dependency; không cài PostgreSQL native; không chạy lại test/build đã đạt. Không thực hiện thao tác thay đổi Git. **Task 5.1 chưa hoàn thành nghiệm thu vì chưa chạy các chức năng bắt buộc với PostgreSQL thật.**

## Cập nhật kiểm tra PostgreSQL local — 13/11/2026

Lượt này tiếp tục phần còn thiếu, không triển khai lại MVP. Chưa phát hiện PostgreSQL local có thể sử dụng và chưa có thông tin kết nối database Assignment 2. Dừng ở hướng dẫn thiết lập theo yêu cầu của người dùng. **Task 5.1 chưa hoàn thành nghiệm thu với PostgreSQL thật.** Các kết quả unit/component/lint/build ở các bảng phía dưới là kết quả của lượt triển khai trước, không phải bằng chứng chạy database thật.

### Bằng chứng kiểm tra môi trường

- PATH không có `psql`, `pg_ctl`, `postgres`; không thấy process `postgres`/`pg_ctl`.
- Không có thư mục PostgreSQL tại `C:\Program Files\PostgreSQL`, `C:\Program Files (x86)\PostgreSQL`, `D:\PostgreSQL`, `C:\Users\ADMIN\AppData\Local\Programs\PostgreSQL`.
- Kiểm tra registry ứng dụng cài đặt không thấy PostgreSQL/pgAdmin. Truy vấn dịch vụ bị sandbox chặn ban đầu; sau khi được cấp quyền kiểm tra chỉ đọc ngoài sandbox, `Win32_Service` không trả về dịch vụ tên chứa `postgres`/`pgsql`.
- Không thấy cổng 5432/5433 ở trạng thái LISTENING. Có một dòng TCP `127.0.0.1:5433` ở trạng thái `FIN_WAIT_1`; đây không phải listener hay bằng chứng PostgreSQL có thể kết nối.
- Không có `.env` root hoặc `apps/api/.env`. Các biến `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `DATABASE_URL` không có trong môi trường tiến trình được kiểm tra. Không đọc/in giá trị password hoặc token.
- Chưa loại trừ một bản PostgreSQL portable ở vị trí khác hoặc server local dùng cổng khác; chưa có thông tin để xác nhận kết nối đó. Không kết nối tới server remote/production/Assignment 1.

### Kết quả lượt tiếp tục

| Hạng mục | PASS/FAIL/NOT VERIFIED | Bằng chứng |
|---|---|---|
| PostgreSQL local sẵn sàng sử dụng | NOT VERIFIED | Không phát hiện công cụ, bản cài, dịch vụ hoặc listener tiêu chuẩn; chưa có endpoint local khác được xác nhận |
| Rà soát `.env.example` và đường dẫn nạp env | PASS | DB_HOST=localhost, DB_PORT=5432, DB_NAME=brewlite_assignment2; password/JWT để trống. Khi chạy từ apps/api, AppModule nạp env root trước env tại apps/api. Env tiến trình có thể ghi đè file |
| Rà soát DatabaseModule | PASS | PostgreSQL/TypeORM, đủ 4 entity và 4 migration theo thứ tự; synchronize=false; migrationsRun=true. Đây là kiểm tra tĩnh |
| Rà soát migrations và entity | PASS | Các cột users/orders/order_items/payments, foreign keys và payment idempotency có trong migration; chưa phát hiện lỗi qua đọc code, chưa chứng minh thực thi SQL |
| Bảo vệ file cấu hình local | PASS | `git check-ignore .env apps/api/.env` xác nhận cả hai bị ignore |
| Kết nối database Assignment 2 thực tế | NOT VERIFIED | Chưa có database target được người dùng xác nhận và chưa có env kết nối |
| Chạy migration, kiểm tra bảng/index | NOT VERIFIED | Không khởi động backend vì startup tự chạy migration; chưa có target an toàn để ghi |
| Register/login với PostgreSQL thật | NOT VERIFIED | Chưa kết nối repository Users thực tế |
| Tạo đơn PENDING và lưu OrderItem thật | NOT VERIFIED | Chưa thực hiện transaction trên PostgreSQL |
| Mock payment success/failure, ownership, Idempotency-Key thật | NOT VERIFIED | Chưa kiểm tra transaction, row locks và unique index trên DB thật |
| Restart backend và kiểm tra history | NOT VERIFIED | Chưa có order/payment thực để đối chiếu sau restart |

### Hướng dẫn thiết lập an toàn — bạn thực hiện khi sẵn sàng

1. Nếu đã có PostgreSQL portable hoặc dịch vụ local ở vị trí/cổng khác, cung cấp đường dẫn công cụ và host/port/database target để kiểm tra; không gửi mật khẩu qua chat. Nếu chưa có, bạn có thể tự cài PostgreSQL 17 từ [trang Windows chính thức](https://www.postgresql.org/download/windows/). Trang này dẫn tới installer EDB, có PostgreSQL server và pgAdmin. Codex chưa tải hoặc cài phần mềm hệ thống.
2. Khi cài, giữ kết nối local và ghi lại port thực tế (có thể dùng 5432 nếu trống). Sau khi dịch vụ chạy, dùng pgAdmin kết nối `127.0.0.1`. Không chọn server production hoặc database Assignment 1 đang có dữ liệu.
3. Chỉ khi bạn đồng ý tạo database riêng: trong pgAdmin, tự tạo Login/Group Role `brewlite_a2`, đặt mật khẩu local, bật Can login và không cấp Superuser/Create databases. Sau đó dùng tài khoản quản trị local tạo database `brewlite_assignment2`, owner `brewlite_a2`. Nếu database/role này đã tồn tại, kiểm tra mục đích và dữ liệu trước, không xóa/reset/ghi đè. Đây là hướng dẫn thao tác thủ công, chưa được Codex thực hiện.
4. Tự copy `.env.example` sang `.env` ở root repository, rồi điền các giá trị local dưới đây. Giá trị trong dấu `<...>` là placeholder, không phải secret mẫu để dùng nguyên văn:

   ```dotenv
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_USER=brewlite_a2
   DB_PASSWORD="<mật khẩu role local bạn vừa đặt>"
   DB_NAME=brewlite_assignment2
   JWT_SECRET="<giá trị ngẫu nhiên riêng ít nhất 32 byte>"
   PAYMENT_DEMO_ENABLED=true
   ```

   Giữ PORT/WEB_ORIGIN/NEXT_PUBLIC_API_URL như mẫu nếu không đổi cổng ứng dụng. Không đưa DB password hoặc JWT_SECRET vào biến NEXT_PUBLIC_*. Có thể sinh JWT_SECRET ngay trên máy bằng lệnh trong `.env.example`; không gửi giá trị đó qua chat hoặc commit vào Git.
5. **Chưa chạy backend ngay:** DatabaseModule bật `migrationsRun: true`, nên khởi động API sẽ ghi schema tự động. Trước đó, cần xác nhận host, port, database, owner và schema target bằng kết nối chỉ đọc. Trong Query Tool của đúng database Assignment 2 có thể chạy:

   ```sql
   SELECT current_database(), current_user,
          inet_server_addr(), inet_server_port(), version();
   SELECT tablename FROM pg_tables
   WHERE schemaname = 'public' ORDER BY tablename;
   ```

   Nếu là database mới, không có bảng ứng dụng. Nếu đã có bảng, cần rà soát schema/migration history trước khi áp dụng; không reset để làm sạch.
6. Sau khi bạn xác nhận PostgreSQL local và target Assignment 2 đã sẵn sàng, lượt tiếp theo sẽ xác nhận kết nối chỉ đọc trước, rồi chạy API từ `apps/api` để TypeORM áp dụng migration đang chờ. Sau migration phải kiểm tra `users`, `orders`, `order_items`, `payments`, bảng `migrations`, đủ 4 migration và index `UQ_payments_user_idempotency_key`. Không chạy migration `down`, drop hoặc reset.
7. Khi đó mới chạy register/login hai tài khoản A/B; tạo order PENDING và kiểm tra các OrderItem; thử payment SUCCESS/FAILED, giữ cart khi fail, ownership và replay Idempotency-Key; ghi lại ID/số lượng record rồi restart backend để đối chiếu history. Các mục này tiếp tục NOT VERIFIED cho đến khi có kết quả PostgreSQL thật.

Tham khảo: [Windows installer](https://www.postgresql.org/download/windows/), [database ownership](https://www.postgresql.org/docs/17/sql-createdatabase.html), [psql](https://www.postgresql.org/docs/17/app-psql.html).

### File thay đổi trong lượt tiếp tục này

| File | Tạo mới/Chỉnh sửa | Nội dung |
|---|---|---|
| `docs/task5.1-report.md` | Chỉnh sửa | Thêm inventory PostgreSQL, bảng trạng thái thực tế, hướng dẫn setup và điều kiện để chạy migration an toàn |

Không tạo file mới hoặc `.env`; không sửa source/migrations/tests/CI. Không chạy lại test/lint/build đã PASS. Không cài PostgreSQL, không tạo/xóa/reset database, không chạy migration hoặc thực hiện thao tác thay đổi Git.

## Kết quả và giới hạn

Đã triển khai code Task 5.1 trong workspace, ưu tiên tái sử dụng Assignment 1. Chưa thể kết luận nghiệm thu toàn bộ: chưa có cấu hình kết nối PostgreSQL local để chạy migrations và kiểm chứng luồng lưu dữ liệu thật/restart. Unit tests dùng repository/DataSource mock không phải bằng chứng persistence thật.

Nguồn audit: `C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/`, commit `25824e116d582c8933dbf68a1c21cd1ea7d32df3`. Tìm thấy bản clone có sẵn, không clone lại.

Baseline đầu lượt: 66 file, repo đang ở main và còn các thay đổi chưa commit của Task 4.3/4.4. Không tạo/đổi branch, stage, commit, push, merge, reset hoặc rebase. Không có file baseline bị xóa. Những thay đổi cần thiết được tích hợp vào file Task 4.3 hiện tại; không chép đè toàn bộ apps từ Assignment 1.

## Audit component

| Component | Assignment 1 (logic đã đọc) | Assignment 2 trước lượt này | Action |
|---|---|---|---|
| Products/Menu | Sample service và UI có sẵn | Task 4.3 đang có API/menu | KEEP / MODIFY |
| Product detail/options | Có nhưng phụ thuộc inventory/recipe | Chưa có | COPY / MODIFY |
| Cart | React Context + localStorage, variants và totals | Chưa có | COPY / MODIFY |
| Auth/JWT/Users | bcrypt, JWT 15 phút, guard, TypeORM user repository | Chưa có | COPY |
| Orders/items/history | Transaction, snapshot giá, filter user; có thêm kho/khuyến mãi/staff | Chưa có | COPY / MODIFY |
| Mock payments | Wallet/Card, ownership, row locks, response snapshot/idempotency | Chưa có | COPY / MODIFY |
| Database | PostgreSQL/TypeORM migrations | Products sample trong bộ nhớ | REUSE / MODIFY |
| CI | Install → Lint → Unit Test → Build | Task 4.4 đã có | KEEP |

## Bảng 1 – File tái sử dụng

Mỗi target dưới đây là file mới trong Assignment 2 ở lượt Task 5.1. Copy nghĩa là giữ nguyên byte từ nguồn; Modify nghĩa là có chỉnh sửa logic/phạm vi hoặc định dạng sau khi tái sử dụng.

| STT | File nguồn Assignment 1 | File đích Assignment 2 | Copy/Modify | Lý do |
|---|---|---|---|---|
| 1 | [apps/api/src/auth/auth.controller.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/auth/auth.controller.ts) | [apps/api/src/auth/auth.controller.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/auth/auth.controller.ts) | Copy | Tái sử dụng bcrypt/JWT/DTO/guard và kiểm thử xác thực |
| 2 | [apps/api/src/auth/auth.module.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/auth/auth.module.ts) | [apps/api/src/auth/auth.module.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/auth/auth.module.ts) | Copy | Tái sử dụng bcrypt/JWT/DTO/guard và kiểm thử xác thực |
| 3 | [apps/api/src/auth/auth.service.spec.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/auth/auth.service.spec.ts) | [apps/api/src/auth/auth.service.spec.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/auth/auth.service.spec.ts) | Copy | Tái sử dụng bcrypt/JWT/DTO/guard và kiểm thử xác thực |
| 4 | [apps/api/src/auth/auth.service.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/auth/auth.service.ts) | [apps/api/src/auth/auth.service.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/auth/auth.service.ts) | Copy | Tái sử dụng bcrypt/JWT/DTO/guard và kiểm thử xác thực |
| 5 | [apps/api/src/auth/dto/auth.dto.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/auth/dto/auth.dto.ts) | [apps/api/src/auth/dto/auth.dto.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/auth/dto/auth.dto.ts) | Copy | Tái sử dụng bcrypt/JWT/DTO/guard và kiểm thử xác thực |
| 6 | [apps/api/src/auth/guards/jwt-auth.guard.spec.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/auth/guards/jwt-auth.guard.spec.ts) | [apps/api/src/auth/guards/jwt-auth.guard.spec.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/auth/guards/jwt-auth.guard.spec.ts) | Copy | Tái sử dụng bcrypt/JWT/DTO/guard và kiểm thử xác thực |
| 7 | [apps/api/src/auth/guards/jwt-auth.guard.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/auth/guards/jwt-auth.guard.ts) | [apps/api/src/auth/guards/jwt-auth.guard.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/auth/guards/jwt-auth.guard.ts) | Copy | Tái sử dụng bcrypt/JWT/DTO/guard và kiểm thử xác thực |
| 8 | [apps/api/src/app.module.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/app.module.ts) | [apps/api/src/database/database.module.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/database/database.module.ts) | Modify | Giữ PostgreSQL/TypeORM; chỉ đăng ký entities và migrations thuộc MVP |
| 9 | [apps/api/src/database/migrations/1710000000000-CreateOrders.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/database/migrations/1710000000000-CreateOrders.ts) | [apps/api/src/database/migrations/1710000000000-CreateOrders.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/database/migrations/1710000000000-CreateOrders.ts) | Copy | Tái sử dụng màn hình/trạng thái khách hàng tương thích Task 5.1 |
| 10 | [apps/api/src/database/migrations/1710000001000-AddUsersAndOrderOwner.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/database/migrations/1710000001000-AddUsersAndOrderOwner.ts) | [apps/api/src/database/migrations/1710000001000-AddUsersAndOrderOwner.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/database/migrations/1710000001000-AddUsersAndOrderOwner.ts) | Copy | Tái sử dụng màn hình/trạng thái khách hàng tương thích Task 5.1 |
| 11 | [apps/api/src/database/migrations/1710000002000-CreatePayments.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/database/migrations/1710000002000-CreatePayments.ts) | [apps/api/src/database/migrations/1710000002000-CreatePayments.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/database/migrations/1710000002000-CreatePayments.ts) | Copy | Tái sử dụng màn hình/trạng thái khách hàng tương thích Task 5.1 |
| 12 | [apps/api/src/database/migrations/1710000003000-Task10BusinessRules.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/database/migrations/1710000003000-Task10BusinessRules.ts) | [apps/api/src/database/migrations/1710000003000-MvpPaymentIdempotency.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/database/migrations/1710000003000-MvpPaymentIdempotency.ts) | Modify | Lấy phần role tương thích và idempotency từ migration nguồn; bỏ kho/khuyến mãi |
| 13 | [apps/api/src/orders/dto/create-order-item.dto.spec.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/orders/dto/create-order-item.dto.spec.ts) | [apps/api/src/orders/dto/create-order-item.dto.spec.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/orders/dto/create-order-item.dto.spec.ts) | Copy | Giữ snapshot item, giá server, persistence và lịch sử theo user; bỏ staff/kho/khuyến mãi |
| 14 | [apps/api/src/orders/dto/create-order-item.dto.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/orders/dto/create-order-item.dto.ts) | [apps/api/src/orders/dto/create-order-item.dto.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/orders/dto/create-order-item.dto.ts) | Modify | Giữ snapshot item, giá server, persistence và lịch sử theo user; bỏ staff/kho/khuyến mãi |
| 15 | [apps/api/src/orders/entities/order-item.entity.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/orders/entities/order-item.entity.ts) | [apps/api/src/orders/entities/order-item.entity.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/orders/entities/order-item.entity.ts) | Copy | Giữ snapshot item, giá server, persistence và lịch sử theo user; bỏ staff/kho/khuyến mãi |
| 16 | [apps/api/src/orders/entities/order.entity.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/orders/entities/order.entity.ts) | [apps/api/src/orders/entities/order.entity.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/orders/entities/order.entity.ts) | Modify | Giữ snapshot item, giá server, persistence và lịch sử theo user; bỏ staff/kho/khuyến mãi |
| 17 | [apps/api/src/orders/order-state.spec.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/orders/order-state.spec.ts) | [apps/api/src/orders/order-state.spec.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/orders/order-state.spec.ts) | Copy | Giữ snapshot item, giá server, persistence và lịch sử theo user; bỏ staff/kho/khuyến mãi |
| 18 | [apps/api/src/orders/order-state.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/orders/order-state.ts) | [apps/api/src/orders/order-state.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/orders/order-state.ts) | Copy | Giữ snapshot item, giá server, persistence và lịch sử theo user; bỏ staff/kho/khuyến mãi |
| 19 | [apps/api/src/orders/orders.controller.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/orders/orders.controller.ts) | [apps/api/src/orders/orders.controller.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/orders/orders.controller.ts) | Modify | Giữ snapshot item, giá server, persistence và lịch sử theo user; bỏ staff/kho/khuyến mãi |
| 20 | [apps/api/src/orders/orders.module.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/orders/orders.module.ts) | [apps/api/src/orders/orders.module.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/orders/orders.module.ts) | Modify | Giữ snapshot item, giá server, persistence và lịch sử theo user; bỏ staff/kho/khuyến mãi |
| 21 | [apps/api/src/orders/orders.service.spec.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/orders/orders.service.spec.ts) | [apps/api/src/orders/orders.service.spec.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/orders/orders.service.spec.ts) | Modify | Giữ snapshot item, giá server, persistence và lịch sử theo user; bỏ staff/kho/khuyến mãi |
| 22 | [apps/api/src/orders/orders.service.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/orders/orders.service.ts) | [apps/api/src/orders/orders.service.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/orders/orders.service.ts) | Modify | Giữ snapshot item, giá server, persistence và lịch sử theo user; bỏ staff/kho/khuyến mãi |
| 23 | [apps/api/src/payments/create-payment.dto.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/payments/create-payment.dto.ts) | [apps/api/src/payments/create-payment.dto.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/payments/create-payment.dto.ts) | Copy | Giữ mock Wallet/Card, ownership, transaction, Idempotency-Key; bỏ cộng điểm |
| 24 | [apps/api/src/payments/mock-payment.provider.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/payments/mock-payment.provider.ts) | [apps/api/src/payments/mock-payment.provider.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/payments/mock-payment.provider.ts) | Copy | Giữ mock Wallet/Card, ownership, transaction, Idempotency-Key; bỏ cộng điểm |
| 25 | [apps/api/src/payments/payment-provider.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/payments/payment-provider.ts) | [apps/api/src/payments/payment-provider.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/payments/payment-provider.ts) | Copy | Giữ mock Wallet/Card, ownership, transaction, Idempotency-Key; bỏ cộng điểm |
| 26 | [apps/api/src/payments/payment.entity.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/payments/payment.entity.ts) | [apps/api/src/payments/payment.entity.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/payments/payment.entity.ts) | Copy | Giữ mock Wallet/Card, ownership, transaction, Idempotency-Key; bỏ cộng điểm |
| 27 | [apps/api/src/payments/payments.controller.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/payments/payments.controller.ts) | [apps/api/src/payments/payments.controller.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/payments/payments.controller.ts) | Copy | Giữ mock Wallet/Card, ownership, transaction, Idempotency-Key; bỏ cộng điểm |
| 28 | [apps/api/src/payments/payments.module.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/payments/payments.module.ts) | [apps/api/src/payments/payments.module.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/payments/payments.module.ts) | Copy | Giữ mock Wallet/Card, ownership, transaction, Idempotency-Key; bỏ cộng điểm |
| 29 | [apps/api/src/payments/payments.service.spec.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/payments/payments.service.spec.ts) | [apps/api/src/payments/payments.service.spec.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/payments/payments.service.spec.ts) | Modify | Giữ mock Wallet/Card, ownership, transaction, Idempotency-Key; bỏ cộng điểm |
| 30 | [apps/api/src/payments/payments.service.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/payments/payments.service.ts) | [apps/api/src/payments/payments.service.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/payments/payments.service.ts) | Modify | Giữ mock Wallet/Card, ownership, transaction, Idempotency-Key; bỏ cộng điểm |
| 31 | [apps/api/src/orders/orders.service.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/orders/orders.service.ts) | [apps/api/src/products/product-options.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/products/product-options.ts) | Modify | Tách giá size/topping từ OrdersService nguồn thành metadata chuẩn dùng cho API và tính tiền server |
| 32 | [apps/api/src/users/user.entity.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/users/user.entity.ts) | [apps/api/src/users/user.entity.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/users/user.entity.ts) | Copy | Tái sử dụng persistence tài khoản bằng TypeORM |
| 33 | [apps/api/src/users/users.module.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/users/users.module.ts) | [apps/api/src/users/users.module.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/users/users.module.ts) | Copy | Tái sử dụng persistence tài khoản bằng TypeORM |
| 34 | [apps/api/src/users/users.service.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/api/src/users/users.service.ts) | [apps/api/src/users/users.service.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/users/users.service.ts) | Copy | Tái sử dụng persistence tài khoản bằng TypeORM |
| 35 | [apps/web/src/app/cart/page.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/app/cart/page.tsx) | [apps/web/src/app/cart/page.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/cart/page.tsx) | Modify | Giữ state/localStorage và giao diện giỏ hàng; tích hợp tạo đơn MVP |
| 36 | [apps/web/src/app/checkout/page.test.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/app/checkout/page.test.tsx) | [apps/web/src/app/checkout/page.test.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/checkout/page.test.tsx) | Copy | Giữ thanh toán/confirmation; tách snapshot theo tài khoản |
| 37 | [apps/web/src/app/checkout/page.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/app/checkout/page.tsx) | [apps/web/src/app/checkout/page.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/checkout/page.tsx) | Modify | Giữ thanh toán/confirmation; tách snapshot theo tài khoản |
| 38 | [apps/web/src/app/login/page.test.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/app/login/page.test.tsx) | [apps/web/src/app/login/page.test.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/login/page.test.tsx) | Modify | Giữ form xác thực và returnTo an toàn; bỏ đường dẫn staff ngoài phạm vi |
| 39 | [apps/web/src/app/login/page.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/app/login/page.tsx) | [apps/web/src/app/login/page.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/login/page.tsx) | Modify | Giữ form xác thực và returnTo an toàn; bỏ đường dẫn staff ngoài phạm vi |
| 40 | [apps/web/src/app/orders/[id]/page.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/app/orders/[id]/page.tsx) | [apps/web/src/app/orders/[id]/page.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/orders/[id]/page.tsx) | Copy | Giữ snapshot item, giá server, persistence và lịch sử theo user; bỏ staff/kho/khuyến mãi |
| 41 | [apps/web/src/app/orders/page.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/app/orders/page.tsx) | [apps/web/src/app/orders/page.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/orders/page.tsx) | Copy | Giữ snapshot item, giá server, persistence và lịch sử theo user; bỏ staff/kho/khuyến mãi |
| 42 | [apps/web/src/app/products/[id]/page.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/app/products/[id]/page.tsx) | [apps/web/src/app/products/[id]/page.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/products/[id]/page.tsx) | Modify | Giữ cấu trúc trang chi tiết; thay phụ thuộc inventory bằng tùy chọn từ Products API |
| 43 | [apps/web/src/app/register/page.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/app/register/page.tsx) | [apps/web/src/app/register/page.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/register/page.tsx) | Copy | Giữ form đăng ký và lỗi validation từ Assignment 1 |
| 44 | [apps/web/src/components/auth-provider.test.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/components/auth-provider.test.tsx) | [apps/web/src/components/auth-provider.test.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/components/auth-provider.test.tsx) | Copy | Tái sử dụng màn hình/trạng thái khách hàng tương thích Task 5.1 |
| 45 | [apps/web/src/components/auth-provider.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/components/auth-provider.tsx) | [apps/web/src/components/auth-provider.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/components/auth-provider.tsx) | Copy | Tái sử dụng màn hình/trạng thái khách hàng tương thích Task 5.1 |
| 46 | [apps/web/src/components/cart-provider.test.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/components/cart-provider.test.tsx) | [apps/web/src/components/cart-provider.test.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/components/cart-provider.test.tsx) | Modify | Giữ state/localStorage và giao diện giỏ hàng; tích hợp tạo đơn MVP |
| 47 | [apps/web/src/components/cart-provider.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/components/cart-provider.tsx) | [apps/web/src/components/cart-provider.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/components/cart-provider.tsx) | Modify | Giữ state/localStorage và giao diện giỏ hàng; tích hợp tạo đơn MVP |
| 48 | [apps/web/src/components/cart-toast.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/components/cart-toast.tsx) | [apps/web/src/components/cart-toast.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/components/cart-toast.tsx) | Copy | Giữ state/localStorage và giao diện giỏ hàng; tích hợp tạo đơn MVP |
| 49 | [apps/web/src/components/checkout-provider.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/components/checkout-provider.tsx) | [apps/web/src/components/checkout-provider.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/components/checkout-provider.tsx) | Modify | Giữ thanh toán/confirmation; tách snapshot theo tài khoản |
| 50 | [apps/web/src/components/orders-client.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/components/orders-client.tsx) | [apps/web/src/components/orders-client.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/components/orders-client.tsx) | Modify | Tái sử dụng màn hình/trạng thái khách hàng tương thích Task 5.1 |
| 51 | [apps/web/src/components/site-header.tsx](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/components/site-header.tsx) | [apps/web/src/components/site-header.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/components/site-header.tsx) | Modify | Giữ phong cách/giỏ hàng; điều hướng tới các màn hình khách hàng có thật |
| 52 | [apps/web/src/lib/pricing.test.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/lib/pricing.test.ts) | [apps/web/src/lib/pricing.test.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/lib/pricing.test.ts) | Modify | Giữ thuật toán tính giá; giá tùy chọn nhận từ API thay vì catalog frontend riêng |
| 53 | [apps/web/src/lib/pricing.ts](C:/Users/ADMIN/AppData/Local/Temp/brewlite-assignment1-audit-20261113/apps/web/src/lib/pricing.ts) | [apps/web/src/lib/pricing.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/lib/pricing.ts) | Modify | Giữ thuật toán tính giá; giá tùy chọn nhận từ API thay vì catalog frontend riêng |

Tổng: 53 file tái sử dụng/được tách từ nguồn (30 Copy, 23 Modify). Không đưa vào target các module staff, quản lý nguyên liệu, khuyến mãi, đổi/cộng điểm, Docker, CI/CD production hoặc E2E suite đầy đủ của Assignment 1. Các trường role/loyalty mặc định trong user contract được giữ để tương thích source, không có thao tác tích/đổi điểm hay đăng ký tài khoản staff.

## Bảng 2 – File tạo mới

Các file sau được tạo riêng cho tích hợp/kiểm tra Task 5.1, không tính lại các file copy/modify từ nguồn ở bảng 1.

| STT | File | Chức năng | Lý do cần tạo |
|---|---|---|---|
| 1 | [apps/api/src/auth/jwt-contract.spec.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/auth/jwt-contract.spec.ts) | Kiểm tra JWT ký thật, hết hạn, sai chữ ký và missing token. | Kiểm chứng tích hợp hoặc ghi nhận kết quả thực tế |
| 2 | [apps/web/src/app/cart/page.test.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/cart/page.test.tsx) | Kiểm tra tạo đơn không gửi giá client, chặn double click, lỗi sản phẩm và yêu cầu đăng nhập. | Kiểm chứng tích hợp hoặc ghi nhận kết quả thực tế |
| 3 | [apps/web/src/app/products/[id]/page.test.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/products/[id]/page.test.tsx) | Kiểm tra size/topping dùng giá API tùy ý, add đúng variant và sản phẩm 404. | Kiểm chứng tích hợp hoặc ghi nhận kết quả thực tế |
| 4 | [apps/web/src/app/register/page.test.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/register/page.test.tsx) | Kiểm tra xác nhận password và lỗi email trùng. | Kiểm chứng tích hợp hoặc ghi nhận kết quả thực tế |
| 5 | [apps/web/src/components/checkout-provider.test.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/components/checkout-provider.test.tsx) | Kiểm tra snapshot checkout không lộ sang tài khoản khác. | Kiểm chứng tích hợp hoặc ghi nhận kết quả thực tế |
| 6 | [apps/web/src/components/orders-client.test.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/components/orders-client.test.tsx) | Kiểm tra endpoint history theo token, empty và error state. | Kiểm chứng tích hợp hoặc ghi nhận kết quả thực tế |
| 7 | [docs/task5.1-report.md](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/docs/task5.1-report.md) | Lưu audit, danh sách từng file, kết quả kiểm tra và giới hạn PostgreSQL. | Kiểm chứng tích hợp hoặc ghi nhận kết quả thực tế |

## Bảng 3 – File có sẵn được chỉnh sửa

So với SHA-256 baseline đầu lượt, đúng 9 file có sẵn thay đổi. Các file Task 1–3, CSS, package.json, lockfiles, workflow và tài liệu CI giữ nguyên hash.

| STT | File | Nội dung chỉnh sửa | Ảnh hưởng |
|---|---|---|---|
| 1 | [.env.example](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/.env.example) | Bổ sung DB connection placeholders, JWT_SECRET để trống và PAYMENT_DEMO_ENABLED; không có secret thật. | Hướng dẫn/cấu hình Task 5.1 |
| 2 | [apps/api/src/app.module.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/app.module.ts) | Kết nối DatabaseModule, AuthModule, OrdersModule và PaymentsModule sau ConfigModule. | Tích hợp Task 5.1 với Task 4.3 |
| 3 | [apps/api/src/products/products.controller.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/src/products/products.controller.ts) | Bổ sung options trong response chi tiết; giữ GET /products và GET /products/:id. | Tích hợp Task 5.1 với Task 4.3 |
| 4 | [apps/api/test/products.e2e-spec.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/api/test/products.e2e-spec.ts) | Test trực tiếp ProductsModule để không kéo PostgreSQL vào bộ HTTP test Products có sẵn. | Tích hợp Task 5.1 với Task 4.3 |
| 5 | [apps/web/next-env.d.ts](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/next-env.d.ts) | Next.js tự cập nhật tham chiếu route types khi build; không chỉnh logic ứng dụng. | File sinh tự động |
| 6 | [apps/web/src/app/layout.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/layout.tsx) | Bổ sung AuthProvider, CartProvider, CheckoutProvider và CartToast từ nguồn. | Tích hợp Task 5.1 với Task 4.3 |
| 7 | [apps/web/src/app/page.test.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/page.test.tsx) | Mock SiteHeader ở unit test menu, tách test menu khỏi context của header. | Tích hợp Task 5.1 với Task 4.3 |
| 8 | [apps/web/src/app/page.tsx](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/apps/web/src/app/page.tsx) | Dùng SiteHeader tái sử dụng và thêm link từ từng món tới Product Detail; giữ fetch/loading/empty/error menu. | Tích hợp Task 5.1 với Task 4.3 |
| 9 | [README.md](D:/SGU/cnpm/brewlite-assignment2/brewlite-assignment2/README.md) | Cập nhật hướng dẫn cấu hình local PostgreSQL/JWT, migrations và luồng Task 5.1. | Hướng dẫn/cấu hình Task 5.1 |

## Bảng 4 – Đối chiếu Task 5.1

PASS ở bảng này là phạm vi unit/component/HTTP Products đã thực sự chạy. Không diễn giải PASS thành đã thử toàn bộ luồng trên PostgreSQL.

| Yêu cầu | PASS/FAIL/NOT VERIFIED | File thực hiện | Bằng chứng |
|---|---|---|---|
| Product Detail | PASS | apps/web/src/app/products/[id]/page.tsx; apps/api/src/products/products.controller.ts | Component test hiển thị món/tùy chọn và xử lý 404; HTTP Products 3 test đạt |
| Size/Topping | PASS | apps/api/src/products/product-options.ts; apps/api/src/orders/orders.service.ts; apps/web/src/lib/pricing.ts | Frontend dùng giá metadata API; test giá API thay đổi, giá size/topping server và DTO invalid đều đạt |
| Cart | PASS | apps/web/src/components/cart-provider.tsx; apps/web/src/app/cart/page.tsx | Add/update/remove, giữ variant/portion, tổng tiền, restore, merge variant, double click và API 404 được test |
| Register/Login | NOT VERIFIED | apps/api/src/auth/*; apps/api/src/users/*; apps/web/src/app/login/*; apps/web/src/app/register/* | bcrypt hash/login/duplicate email và form tests đạt; chưa chạy register/login với user repository PostgreSQL thật |
| JWT | PASS | apps/api/src/auth/auth.module.ts; guards/jwt-auth.guard.ts; jwt-contract.spec.ts | Token ký thật được xác minh; missing/expired/sai chữ ký bị 401; JWT_SECRET bắt buộc từ env, >=32 byte |
| Create Order | NOT VERIFIED | apps/api/src/orders/* | Unit tests giá server, PENDING, transaction, unknown product và owner filter đạt; chưa xác minh save/commit thực tế |
| Mock Payment | NOT VERIFIED | apps/api/src/payments/*; apps/web/src/app/checkout/* | Unit/component kiểm tra SUCCESS/FAILED, giữ cart khi fail, ownership, replay key, payload conflict và already PAID đạt; chưa kiểm tra row locks/unique index trên PostgreSQL thật |
| Order Confirmation | PASS | apps/web/src/app/checkout/page.tsx; components/checkout-provider.tsx | Component tests xác nhận mã đơn/trạng thái và chỉ clear cart khi payment response SUCCESS; link tới order detail/history |
| Order Status | PASS | apps/api/src/orders/order-state.ts; payments/payments.service.ts | Tests chuyển trạng thái PAID/PAYMENT_FAILED và chặn transition không hợp lệ đạt |
| Order History | NOT VERIFIED | apps/api/src/orders/orders.service.ts; apps/web/src/components/orders-client.tsx | Query theo userId và API path /orders/me, empty/error tests đạt; refresh/restart backend với PostgreSQL chưa thử |
| Frontend validation | PASS | login/register/cart/checkout/product pages và providers | Form errors, backend errors, no-client-price body, loading/double click, giữ cart khi fail, snapshot theo account được test |
| Backend validation | PASS | main.ts; auth DTO/guard; orders DTO/service; payments DTO/service | whitelist/forbidNonWhitelisted; invalid cart/size/topping/price; 401; owner filter/404; conflict và idempotency tests đạt. Chưa kiểm tra toàn bộ HTTP endpoints có DB thật |

## Bảng 5 – Kết quả kiểm tra

| Test / Lint / Build | PASS/FAIL/NOT RUN | Kết quả thực tế |
|---|---|---|
| API unit tests | PASS | Full run: 8 suites/54 tests; sau khi bổ sung jwt-contract, chạy targeted thêm 1 suite/2 tests đạt. Tổng 56 test riêng biệt đã đạt |
| Web unit/component tests | PASS | Final full run: 11 files/38 tests đạt |
| HTTP Products hiện có | PASS | 1 suite/3 tests đạt; chạy một lần với quyền localhost, không mở rộng thành E2E toàn bộ |
| API lint | PASS | npm run lint: oxlint --type-aware src/ test/, exit 0 |
| Web lint | PASS | npm run lint: eslint, exit 0 |
| API build | PASS | npm run build: nest build, exit 0 |
| Web build | PASS | next build đã compile/TypeScript; sandbox ban đầu chặn mkdir .next (EPERM). Chạy lại ngoài sandbox đạt, đủ các route /, /cart, /checkout, /login, /register, /orders, /orders/[id], /products/[id] |
| Web TypeScript sau test mới | PASS | node node_modules/typescript/bin/tsc --noEmit, exit 0 |
| PostgreSQL migrations/persistence | NOT RUN | Không có .env hoặc apps/api/.env; không thấy psql/pg_ctl trong PATH. Không thiết lập database mới, không reset và không kết nối production. Chưa xác minh database đang có ở nơi khác |
| Luồng đầy đủ có DB và restart | NOT RUN | Cần kết nối PostgreSQL local tương thích; không dùng mock để báo đã lưu dữ liệu thật |
| CI GitHub | NOT RUN | Workflow giữ nguyên; không push/PR/Settings trong lượt này |
| Git diff whitespace | PASS | git diff --check, exit 0; chỉ có cảnh báo chuẩn hóa LF/CRLF README |

Lần chạy frontend đầu có một file test pricing thiếu import Vitest sau khi tích hợp; đã sửa và targeted 6 tests đạt. Test mới kiểm tra checkout account có mock fetch không trả Promise; đã sửa mock, targeted test đạt, rồi final full run 38 tests đạt. Không bỏ qua test lỗi hay đổi CI để làm xanh.

## Database và chạy thử local

1. Dùng PostgreSQL hiện có cho Assignment 2 ở local; cấu hình DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME trong .env root. Migrations này nhắm tới schema Assignment 2 sạch hoặc tương thích, không nhắm tới database Assignment 1 đã áp dụng các migration kho/khuyến mãi khác. Chưa chạy bất kỳ migration nào trong lượt này.
2. Sinh JWT_SECRET riêng bằng lệnh trong .env.example và đặt vào .env; không commit giá trị đó. Không dùng secret hoặc thông tin thanh toán thật.
3. Migrations giữ công nghệ TypeORM/PostgreSQL của Assignment 1: CreateOrders, AddUsersAndOrderOwner, CreatePayments và migration idempotency được tách phạm vi. synchronize=false; migrationsRun=true áp dụng migration chưa chạy khi khởi động API. User đăng ký từ UI; không cần seed password/account.
4. Chạy API bằng npm run start:dev ở apps/api và frontend bằng npm run dev ở apps/web. Dependencies đã có; lượt này không cài lại.
5. Thử luồng Menu → Product Detail (size/topping) → Cart → Register/Login → Create Order → Wallet/Card → Confirmation → History. Với PAYMENT_DEMO_ENABLED=true, thử failure và kiểm tra cart còn nguyên; bỏ chọn failure và thử lại trên cùng đơn.
6. Dùng tài khoản B để kiểm tra không đọc/thanh toán đơn A (API chủ động trả 404 cho order không thuộc user); kiểm tra thiếu JWT trả 401, sai DTO trả 400, key khác payload/đơn đã paid trả 409.
7. Refresh frontend rồi restart backend và đăng nhập lại để đối chiếu order code, items, trạng thái và history vẫn còn trong PostgreSQL. Kiểm tra replay cùng Idempotency-Key không tạo thêm payment. Kiểm tra này vẫn là NOT VERIFIED cho tới khi chạy thật.
8. Chỉ cùng metadata size/topping từ backend được dùng cho UI; frontend không gửi unitPrice/lineTotal/totalAmount khi tạo đơn, và payment lấy amount từ Order trong database.

## Bảng 6 – Công việc còn thiếu

| Công việc | Lý do | Task liên quan | Ưu tiên |
|---|---|---|---|
| Cấu hình kết nối PostgreSQL local và JWT_SECRET | Chưa có env kết nối thực; không thể khởi động app đầy đủ hoặc kiểm chứng dữ liệu thật | 5.1 | Cao |
| Chạy migrations trên schema target sạch/tương thích và xác nhận Users/Orders/Items/Payments | Build và unit mocks chưa chứng minh migration/schema tương thích PostgreSQL thực | 5.1 | Cao |
| Xác minh register/login/create order/payment success+fail/ownership/idempotency trên database thật | Chưa có transaction/row lock/unique constraint thực để đo | 5.1 | Cao |
| Xác minh history và trạng thái sau refresh/restart backend | Chưa chạy persistence/restart test thực | 5.1 | Cao |
| Bạn review diff, tự chuẩn bị commit/PR | Theo phân quyền Git của người dùng; Codex chỉ dùng Git chỉ đọc | 5.1 | Sau review |
| E2E/integration suite đầy đủ, Docker, CD/production | Ngoài phạm vi lượt này, không triển khai | 5.2–5.4 | Theo giai đoạn sau |

## Kết luận

Code Task 5.1 và kiểm tra local trong phạm vi không có DB đã triển khai. Chưa xác nhận hoàn thành toàn bộ Task 5.1 vì persistence và luồng end-to-end thực chưa kiểm chứng. Có thể chuẩn bị commit/PR để review code; nghiệm thu chức năng cần hoàn tất các mục PostgreSQL ở bảng 6.

Task 4.3 chỉ chỉnh những điểm tích hợp cần thiết: menu link/header, layout providers, product metadata và tách HTTP Products test khỏi AppModule có DB. Test menu/Products vẫn đạt. Task 4.4 giữ nguyên workflow và lockfiles, unit CI không cần PostgreSQL. Tài liệu Task 1–3/CSS giữ nguyên; không có file baseline bị xóa. Không triển khai Task 5.2–5.4, không Docker/production và không sửa/đóng Issue #11.
