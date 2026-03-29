# Cập nhật hệ thống - 2026-03-29

## 1. Phạm vi đợt cập nhật

Đợt này tập trung vào 5 nhóm chính:

- Tách riêng layout in `A4` và `A5`.
- Chuẩn hóa báo cáo và lịch sử tồn kho.
- Thêm metadata cho `stock_movement` để truy vết chứng từ và đơn vị hiển thị.
- Bổ sung luồng đa đơn vị từ master sản phẩm tới POS và tồn kho.
- Sửa runtime Prisma để backend kết nối database ổn định hơn.

## 2. Tổng hợp thay đổi đã triển khai

### 2.1. In hóa đơn A4/A5

- Tách 2 layout in `A4` và `A5` riêng trong POS, không còn dùng chung một template rồi scale.
- Thiết lập `@page` theo khổ giấy cố định và tách riêng `width`, `padding`, `font`, `column width` theo từng khổ.
- Giữ cảnh báo trong popup cài đặt in để nhắc người dùng chọn đúng khổ giấy tương ứng trong popup in của trình duyệt.
- Đồng bộ lại hành vi cài đặt in để tránh tình trạng trong app chọn một khổ nhưng preview vẫn đang render theo khổ cũ.

File chính:
- `frontend/src/components/sales/POSPage.tsx`
- `frontend/src/components/sales/POSPage.css`

### 2.2. Báo cáo tồn kho và drill-down chi tiết

- Chuẩn hóa `inventory report/history` để hiểu:
  - `SALE` là xuất kho
  - `RETURN` là nhập kho
  - `PURCHASE` là nhập kho
- Thêm drill-down tại màn `Tồn kho`: click vào sản phẩm sẽ mở modal chi tiết xuất nhập.
- Modal chi tiết hiện được các trường:
  - `Thời gian`
  - `Loại giao dịch`
  - `Số lượng`
  - `ĐVT`
  - `Kho`
  - `Công ty`
  - `Chứng từ`
  - `Người thực hiện`
  - `Ghi chú`
  - `Khách hàng` cho giao dịch bán nếu truy ra được hóa đơn
- Báo cáo tồn kho và modal chi tiết hiển thị thêm số lượng quy đổi khi sản phẩm có đa đơn vị.

File chính:
- `backend/src/inventory/inventory.service.ts`
- `frontend/src/components/inventory/InventoryOverview.tsx`
- `frontend/src/components/inventory/InventoryOverview.css`

### 2.3. Metadata mới cho stock_movement

Đã bổ sung các trường mới cho `stock_movement`:

- `referenceType`
- `referenceId`
- `referenceCode`
- `displayQuantity`
- `displayUnit`

Ý nghĩa:
- Cho biết giao dịch này đến từ loại chứng từ nào.
- Cho biết giao dịch gắn với bản ghi nào.
- Cho biết mã chứng từ hiển thị cho người dùng.
- Lưu được số lượng và đơn vị mà người dùng thực sự thao tác, thay vì chỉ lưu số lượng cơ bản trong kho.

Migration mới:
- `backend/prisma/migrations/20260329173000_add_stock_movement_metadata/migration.sql`

Schema và backend liên quan:
- `backend/prisma/schema.prisma`
- `backend/src/inventory/dto/adjust-stock.dto.ts`
- `backend/src/inventory/dto/bulk-adjust.dto.ts`
- `backend/src/sales/dto/create-order.dto.ts`
- `backend/src/purchases/dto/create-purchase.dto.ts`
- `backend/src/purchases/dto/update-purchase.dto.ts`

### 2.4. Ghi metadata khi bán hàng, nhập hàng, điều chỉnh kho

#### Bán hàng / trả hàng

- Luồng `sales` giờ ghi vào `stock_movement` đầy đủ:
  - số lượng cơ bản để trừ tồn
  - số lượng hiển thị
  - đơn vị hiển thị
  - mã và loại chứng từ
- Luồng trả hàng dùng dữ liệu hóa đơn liên quan để phục hồi metadata hiển thị chính xác hơn.

File chính:
- `backend/src/sales/sales.service.ts`
- `backend/src/invoices/invoices.service.ts`

#### Nhập hàng

- Luồng `purchases` khi tạo movement nhập kho đã ghi:
  - `displayQuantity`
  - `displayUnit`
  - `referenceType`
  - `referenceId`
  - `referenceCode`

File chính:
- `backend/src/purchases/purchases.service.ts`

#### Điều chỉnh kho

- Luồng `adjust stock` và `bulk adjust` giờ nhận và lưu được metadata đơn vị/chứng từ thay vì chỉ lưu vào `note`.

File chính:
- `backend/src/inventory/inventory.service.ts`

### 2.5. Đa đơn vị: đơn vị bán, đơn vị cơ bản, tỷ lệ quy đổi

#### Master sản phẩm

- Sản phẩm hiện dùng được 3 dữ liệu chính:
  - `unit`: đơn vị bán/đơn vị hiển thị
  - `baseUnitCode`: đơn vị cơ bản trong kho
  - `conversionRate`: tỷ lệ quy đổi từ đơn vị bán sang đơn vị cơ bản
- Form sản phẩm đã thêm các trường này và có logic hỗ trợ nhập liệu để đỡ sai.
- Danh sách sản phẩm hiển thị rõ quan hệ giữa đơn vị bán và đơn vị cơ bản.

File chính:
- `backend/src/products/products.service.ts`
- `frontend/src/components/products/ProductForm.tsx`
- `frontend/src/components/products/ProductList.tsx`
- `frontend/src/components/products/ProductList.css`

#### POS

- Mỗi dòng hàng trên POS có thể chọn đơn vị bán.
- Ô `SL` trên POS giờ cho phép nhập tối đa `1 chữ số sau dấu phẩy`, hỗ trợ cả `,` và `.` khi nhập tay.
- Số lượng lẻ chỉ được chấp nhận khi quy đổi về đơn vị cơ bản ra số nguyên hợp lệ, để không làm sai tồn kho.
- Khi đổi đơn vị bán, POS cập nhật lại dữ liệu dòng hàng và dùng `conversionRate` để quy đổi về số lượng cơ bản.
- Khi thanh toán:
  - hóa đơn vẫn hiển thị theo đơn vị bán
  - tồn kho trừ theo đơn vị cơ bản
- Khu vực in hóa đơn cũng ưu tiên hiển thị `displayUnit`.

File chính:
- `frontend/src/components/sales/POSPage.tsx`
- `frontend/src/components/sales/POSPage.css`
- `frontend/src/services/api.ts`

#### Nhập hàng và điều chỉnh kho

- Màn nhập hàng và điều chỉnh kho mặc định ưu tiên đơn vị cơ bản hơn để dữ liệu kho sạch hơn.
- Có bổ sung hint trong màn điều chỉnh kho để nhắc khi sản phẩm có nhiều đơn vị.

File chính:
- `frontend/src/components/purchases/PurchaseList.tsx`
- `frontend/src/components/inventory/StockAdjustment.tsx`

### 2.6. Runtime database / Prisma

- Prisma runtime trong backend giờ ưu tiên `DIRECT_URL` thay vì phụ thuộc hoàn toàn vào `DATABASE_URL`.
- Khi không kết nối được database, backend không còn âm thầm chạy tiếp mà sẽ báo lỗi rõ hơn.
- Đã regenerate lại Prisma client chuẩn và kiểm tra migration.

File chính:
- `backend/src/prisma/prisma.service.ts`

## 3. File đã thay đổi trong đợt này

### Backend

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260329173000_add_stock_movement_metadata/migration.sql`
- `backend/src/prisma/prisma.service.ts`
- `backend/src/inventory/dto/adjust-stock.dto.ts`
- `backend/src/inventory/dto/bulk-adjust.dto.ts`
- `backend/src/inventory/inventory.service.ts`
- `backend/src/invoices/invoices.service.ts`
- `backend/src/products/products.service.ts`
- `backend/src/purchases/dto/create-purchase.dto.ts`
- `backend/src/purchases/dto/update-purchase.dto.ts`
- `backend/src/purchases/purchases.service.ts`
- `backend/src/sales/dto/create-order.dto.ts`
- `backend/src/sales/sales.service.ts`

### Frontend

- `frontend/src/components/inventory/InventoryOverview.tsx`
- `frontend/src/components/inventory/InventoryOverview.css`
- `frontend/src/components/inventory/StockAdjustment.tsx`
- `frontend/src/components/products/ProductForm.tsx`
- `frontend/src/components/products/ProductList.tsx`
- `frontend/src/components/products/ProductList.css`
- `frontend/src/components/purchases/PurchaseList.tsx`
- `frontend/src/components/sales/POSPage.tsx`
- `frontend/src/components/sales/POSPage.css`
- `frontend/src/services/api.ts`

### Tooling / manifest

- `backend/package.json`
- `backend/package-lock.json`
- `frontend/package.json`
- `frontend/package-lock.json`

## 4. Cách chuẩn bị môi trường để test

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Yêu cầu `.env`:

```env
DATABASE_URL=<pooling url hoặc runtime url>
DIRECT_URL=<direct postgres url>
JWT_SECRET=<secret>
SUPABASE_URL=<supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

Ghi chú:
- Backend runtime hiện ưu tiên `DIRECT_URL`.
- Nếu vừa pull code mới, cần chạy lại `npx prisma generate`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 5. Checklist test chức năng mới

### Test 1: In hóa đơn A4

1. Vào POS.
2. Chọn `Khổ giấy in` trong cài đặt là `A4`.
3. Tạo một đơn ngắn 1-3 dòng hàng.
4. Bấm `In`.
5. Trong popup in của trình duyệt, chọn:
   - `Khổ giấy`: `A4`
   - `Tỷ lệ`: `100`
   - nên tắt `Đầu trang và chân trang`

Kết quả mong đợi:
- Mẫu `A4` dùng chiều ngang rộng hơn.
- Nội dung không bị bó hẹp như một bản A5 phóng to.

### Test 2: In hóa đơn A5

1. Trong cài đặt in của POS, đổi `Khổ giấy in` sang `A5`.
2. In lại cùng đơn hàng.
3. Trong popup in của trình duyệt, chọn `A5`.

Kết quả mong đợi:
- Bố cục `A5` là layout riêng.
- Không còn cảm giác chỉ là bản `A4` thu nhỏ.

### Test 3: In đơn dài

1. Tạo đơn có từ 10-20 dòng hàng.
2. Test in cả `A4` và `A5`.

Kết quả mong đợi:
- Bảng hàng hóa xuống trang hợp lý.
- Không chồng chữ, không vỡ cột.

### Test 4: Drill-down tồn kho

1. Vào màn `Tồn kho`.
2. Click vào một dòng sản phẩm.

Kết quả mong đợi:
- Mở modal chi tiết xuất nhập kho.
- Có đủ:
  - thời gian
  - loại giao dịch
  - số lượng
  - đơn vị
  - kho
  - công ty
  - chứng từ
  - người thực hiện
  - ghi chú

### Test 5: Theo dõi bán hàng trong lịch sử kho

1. Tạo một đơn bán hàng cho khách hàng có tên rõ ràng.
2. Vào `Tồn kho`, mở chi tiết sản phẩm vừa bán.

Kết quả mong đợi:
- Dòng `Bán hàng` xuất hiện đúng số lượng.
- Có mã hóa đơn/chứng từ.
- Có tên khách hàng nếu invoice có dữ liệu customer snapshot.

### Test 6: Chuẩn hóa SALE / RETURN

1. Bán một sản phẩm.
2. Trả lại một phần hoặc toàn bộ sản phẩm đó.
3. Mở báo cáo tồn kho và chi tiết movement của sản phẩm.

Kết quả mong đợi:
- `SALE` được hiểu là xuất kho.
- `RETURN` được hiểu là nhập kho.
- Tồn cuối kỳ khớp với giao dịch thực tế.

### Test 7: Đa đơn vị trên sản phẩm

1. Tạo hoặc sửa một sản phẩm:
   - `ĐVT bán`: `Hộp`
   - `ĐVT cơ bản`: `Cái`
   - `Tỷ lệ quy đổi`: `10`
2. Lưu sản phẩm.

Kết quả mong đợi:
- Sản phẩm lưu được đủ 3 thông tin trên.
- Danh sách sản phẩm hiển thị được quan hệ `Hộp -> Cái`.

### Test 8: Đa đơn vị trên POS

1. Thêm sản phẩm nhiều đơn vị vào giỏ hàng.
2. Chọn đơn vị bán là `Hộp`.
3. Nhập số lượng `1,5` hoặc `1.5`.
4. Bán hàng.

Kết quả mong đợi:
- Ô `SL` chấp nhận tối đa 1 số lẻ.
- Hóa đơn và giao diện POS hiển thị đúng `1,5 Hộp`.
- Tồn kho cơ bản bị trừ đúng theo quy đổi, ví dụ tỷ lệ `10` thì trừ `15 Cái`.
- Chi tiết movement hiển thị được cả:
  - `displayQuantity = 1.5`
  - `displayUnit = Hộp`
  - `base quantity = 15`

### Test 9: Chặn số lượng lẻ không hợp lệ

1. Chọn một sản phẩm đang bán trực tiếp theo đúng `ĐVT cơ bản`, ví dụ `Cái`.
2. Tại POS, nhập số lượng `1,5`.

Kết quả mong đợi:
- POS báo lỗi và không lưu số lượng mới.
- Dữ liệu không bị làm tròn âm thầm.

### Test 10: Nhập hàng / điều chỉnh kho với metadata

1. Tạo một phiếu nhập hàng cho sản phẩm có đa đơn vị.
2. Hoặc tạo một phiếu điều chỉnh kho.
3. Mở lại chi tiết movement trong tồn kho.

Kết quả mong đợi:
- Movement có chứng từ tương ứng.
- Movement hiển thị đúng `displayUnit` và `displayQuantity` nếu dữ liệu được gửi lên.

### Test 11: Smoke test database

1. Mở `Dashboard`, `Sản phẩm`, `Tồn kho`.
2. Quan sát Network và terminal backend.

Kết quả mong đợi:
- Không còn `500` hàng loạt do mất kết nối DB.
- Backend có thể log `Prisma connected using DIRECT_URL.`

## 6. Kết quả verify đã thực hiện

- `backend`: `npm run build` pass
- `frontend`: `tsc -b` pass
- `frontend`: `npm run build` pass
- `Prisma`: generate client thành công
- `Prisma`: migrate deploy không có migration pending
- Kết nối DB thực tế: kiểm tra Prisma connect thành công, đọc được `product_count=2533`

## 7. Lưu ý khi nghiệm thu

- Popup in của trình duyệt là phần do browser điều khiển, web app không ép được chắc chắn `khổ giấy`, `lề`, `header/footer`.
- Vì vậy khi test in, cần chọn cùng khổ ở:
  - phần cài đặt in trong app
  - popup in của trình duyệt
- Dữ liệu movement cũ có thể chưa đầy đủ metadata mới; dữ liệu mới phát sinh sau bản cập nhật sẽ đầy đủ hơn.
