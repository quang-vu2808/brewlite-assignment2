# Task 4.4 – Continuous Integration

## Cấu hình trong workspace

Workflow: `.github/workflows/ci.yml`, tên **BrewLite CI**.
Cấu hình tái sử dụng từ workflow CI trong bản clone Assignment 1:
`https://github.com/quang-vu2808/brewlite/blob/main/.github/workflows/ci.yml`.
Giữ hai job độc lập, tên **API CI** và **Web CI**, Node.js 24,
`actions/checkout@v4` và `actions/setup-node@v4` như nguồn.
Bổ sung các sự kiện PR rõ ràng, timeout và cache npm theo lockfile riêng.

| Job | Thư mục | Các bước bắt buộc theo thứ tự |
|---|---|---|
| API CI | `apps/api` | `npm ci` → `npm run lint` → `npm run test -- --runInBand` → `npm run build` |
| Web CI | `apps/web` | `npm ci` → `npm run lint` → `npm run test -- --run` → `npm run build` |

- Runner: `ubuntu-latest`; timeout mỗi job: 20 phút.
- Trigger: PR nhắm tới `main`, khi `opened`, `reopened`, `synchronize`.
- Không lọc đường dẫn file; mọi PR phù hợp đều chạy cả hai job.
- Cache lưu dữ liệu tải npm, không cache `node_modules`; `npm ci` vẫn chạy đúng một lần mỗi job.
- Các gate dùng cơ chế dừng khi lỗi mặc định của Actions; không có `continue-on-error`, `|| true`, `--passWithNoTests` hoặc bỏ qua bước khi thất bại.
- Quyền workflow: `contents: read`. Không có deploy, auto-merge hoặc secret production.
- Node.js local đã kiểm tra: v24.18.0. Hai lockfile npm phiên bản 3 khớp dependencies/devDependencies của package.json tương ứng.
- API unit tests chỉ sử dụng ProductsService/ProductsController với sample catalog trong bộ nhớ; không cần PostgreSQL hay API server. E2E HTTP có sẵn thuộc bộ kiểm tra riêng, không nằm trong gate **Unit Test** này.
- Web test mock `fetch`; build trang menu không cần NestJS server đang chạy. `NEXT_PUBLIC_API_URL=http://localhost:3001` là URL CI an toàn; tắt telemetry bằng `NEXT_TELEMETRY_DISABLED=1`.

## Trạng thái xác minh

Đã kiểm tra YAML và cấu trúc workflow, tên scripts, thư mục, lockfile, thứ tự các gate và quyền/biến môi trường. Các lệnh lint/unit test/build của cả hai app đã đạt ở lần kiểm tra Task 4.3 trước đó trên Windows. Task 4.4 chỉ thêm workflow và tài liệu; không cài lại dependencies hay chạy lại bộ kiểm tra ứng dụng vì source, tests và package configuration không thay đổi.

**NOT VERIFIED trên GitHub:** trigger thực tế, npm ci trên Ubuntu, kết quả hai job, branch protection, bằng chứng pipeline PASS và FAIL. Kiểm tra tĩnh/local không thay thế kết quả GitHub Actions.

## Bạn thực hiện sau khi tự quản lý Git và push

1. Đưa đầy đủ code Task 4.3, hai package-lock.json và workflow vào cùng PR nhắm tới `main`. Các file Task 4.3 hiện chưa commit; nếu chỉ đưa workflow lên thì runner sẽ thiếu apps để chạy.
2. Mở PR hoặc cập nhật commit trên PR đã mở. Vào **Checks** hoặc **Actions → BrewLite CI**. Nếu Actions yêu cầu cho phép chạy workflow của contributor/fork, xử lý yêu cầu đó bằng tài khoản có quyền phù hợp.
3. Chờ **API CI** và **Web CI** thành công trước khi cấu hình chúng làm required checks. Nếu chưa hiện tên check để chọn, chạy PR trước rồi quay lại Settings.

## Branch protection – bạn thiết lập thủ công

Trong repository Assignment 2, mở **Settings → Branches → Add classic branch protection rule** (hoặc chỉnh rule đã có cho `main`).

1. Branch name pattern: `main`.
2. Bật **Require a pull request before merging**.
3. Bật **Require status checks to pass before merging**.
4. Chọn đúng **API CI** và **Web CI** từ workflow **BrewLite CI**; chọn nguồn **GitHub Actions** nếu giao diện cho phép. Không chỉ chọn một job và không dùng tên step như `Lint` hay `Build`.
5. Bật **Require branches to be up to date before merging** nếu muốn kiểm tra với trạng thái `main` mới nhất. Cách này không cần bật merge queue.
6. Để quy tắc áp dụng cả người có quyền bypass mặc định, bật **Do not allow bypassing the above settings** nếu mục này có trên giao diện. Với ruleset tương đương, đặt Enforcement thành **Active** và kiểm tra danh sách bypass.
7. Lưu rule. Trên PR thử nghiệm có một required job thất bại, kiểm tra vùng merge hiển thị bị chặn; lưu ảnh này làm minh chứng.

Workflow tự FAIL khi lệnh lỗi; việc **chặn merge** phải được enforcement bởi branch protection/ruleset đang hoạt động. Không thể khẳng định đã chặn merge chỉ từ nội dung YAML.

GitHub Free hỗ trợ protected branches cho repository public. Repository private cần gói hỗ trợ như GitHub Pro/Team/Enterprise theo loại tài khoản. Cần quyền admin hoặc quyền chỉnh repository rules để thiết lập. Nếu Settings thông báo gói hiện tại không hỗ trợ enforcement, ghi lại hạn chế đó. Có thể kiểm tra Checks và chỉ merge thủ công khi cả hai xanh; cách kiểm tra này **không bảo đảm chặn merge kỹ thuật** và chưa đáp ứng đầy đủ yêu cầu Task 4.4. Muốn đáp ứng đầy đủ cần repository/gói hỗ trợ và rule có hiệu lực.

## Minh chứng PASS

1. Dùng PR có code hợp lệ nhắm tới `main` và workflow này.
2. Chờ cả **API CI** và **Web CI** xanh; mở từng job và xác nhận Install, Lint, Unit Test, Build đều thành công.
3. Lưu ảnh trang Checks của PR và trang tổng quan workflow, kèm URL PR, URL Actions run, commit SHA, thời điểm chạy và hai tên job.
4. Trong trang run, tải **Download log archive** nếu có; lưu log làm bằng chứng bổ sung. Không dùng kết quả local để thay thế run GitHub.

## Minh chứng FAIL an toàn – chỉ trên branch thử nghiệm do bạn tạo

Các bước dưới đây là hướng dẫn, chưa được thực hiện trong workspace hiện tại.

1. Từ phiên bản vừa PASS, tự tạo một branch thử nghiệm riêng (ví dụ `ci-evidence-fail`) và mở PR riêng vào `main`. Không sửa `main`, không merge PR minh chứng lỗi.
2. Chỉ trên branch thử nghiệm, thêm file mới `apps/web/src/ci-evidence.test.ts` với nội dung:

   ```ts
   import { expect, it } from "vitest";

   it("demonstrates that CI rejects a failing unit test", () => {
     expect(true).toBe(false);
   });
   ```

   Đây là test lỗi cố ý phục vụ minh chứng, không sửa hoặc thay thế test Task 4.3 đang có.
3. Tự commit/push branch thử nghiệm. Chờ **Web CI → Unit Test** FAIL vì assertion trên; xác nhận **Build** của job đó bị bỏ qua do bước trước lỗi. **API CI** chạy độc lập.
4. Lưu ảnh/log lỗi, URL run, commit SHA và ảnh PR bị chặn merge bởi required check **Web CI**. Nếu workflow bị lỗi YAML hoặc Install thất bại trước Unit Test, đó chưa phải minh chứng test gate phát hiện lỗi như ví dụ này.
5. Khôi phục bằng cách xóa đúng file test tạm vừa thêm trên branch thử nghiệm, rồi tự tạo commit khôi phục và push lại. Không xóa hoặc sửa test có sẵn; không force-push, không dùng reset hard, không bỏ gate để làm xanh CI.
6. Chờ cả hai job PASS trở lại; giữ URL run FAIL cũ và run PASS mới. PR thử nghiệm vẫn không cần merge.

## Điều kiện nghiệm thu Task 4.4

- [x] Có workflow trong workspace với hai chuỗi Install → Lint → Unit Test → Build.
- [x] Có hướng dẫn thiết lập required checks và tạo minh chứng an toàn.
- [ ] Workflow đã chạy thực tế trên GitHub, hai job PASS.
- [ ] Rule cho `main` có hiệu lực, bắt buộc cả API CI và Web CI.
- [ ] Có run FAIL do quality gate phát hiện lỗi và ảnh merge bị chặn.
- [ ] Branch thử nghiệm đã khôi phục và có run PASS sau khôi phục.

Task 4.4 chưa thể nghiệm thu toàn bộ khi các mục GitHub ở trên chưa được xác minh.

## Tài liệu GitHub tham khảo

- [PR workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request)
- [setup-node v4: npm cache và cache-dependency-path](https://github.com/actions/setup-node/tree/v4)
- [Tạo branch protection rule và giới hạn gói tài khoản](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)
