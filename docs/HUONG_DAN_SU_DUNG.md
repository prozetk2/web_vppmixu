# 📘 HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QUẢN LÝ BÁN HÀNG & KHO HÀNG (WMS)

**Phiên bản:** 1.0  
**Cập nhật lần cuối:** 14/03/2026  
**Hỗ trợ:** MIXU Office Supplies

---

## MỤC LỤC

1. [Đăng nhập hệ thống](#1-đăng-nhập-hệ-thống)
2. [Tổng quan Dashboard](#2-tổng-quan-dashboard)
3. [Bán hàng (POS)](#3-bán-hàng-pos)
4. [Nhập hàng](#4-nhập-hàng)
5. [Đơn hàng](#5-đơn-hàng)
6. [Hóa đơn](#6-hóa-đơn)
7. [Sản phẩm (Hàng hóa)](#7-sản-phẩm-hàng-hóa)
8. [Danh mục](#8-danh-mục)
9. [Tồn kho](#9-tồn-kho)
10. [Kho hàng](#10-kho-hàng)
11. [Bảng giá](#11-bảng-giá)
12. [Khách hàng](#12-khách-hàng)
13. [Nhà cung cấp](#13-nhà-cung-cấp)
14. [Báo cáo](#14-báo-cáo)
15. [Cài đặt](#15-cài-đặt)
16. [Mẹo sử dụng & Câu hỏi thường gặp](#16-mẹo-sử-dụng--câu-hỏi-thường-gặp)

---

## 1. ĐĂNG NHẬP HỆ THỐNG

### 1.1. Truy cập hệ thống

- Mở trình duyệt web (khuyến khích sử dụng **Google Chrome** hoặc **Microsoft Edge**).
- Nhập địa chỉ website hệ thống vào thanh địa chỉ (URL do quản trị viên cung cấp).

### 1.2. Thực hiện đăng nhập

1. Tại màn hình đăng nhập, bạn sẽ thấy 2 trường nhập liệu:
   - **Tên đăng nhập**: Nhập tên tài khoản được cấp.
   - **Mật khẩu**: Nhập mật khẩu. Nhấn vào biểu tượng **👁 (con mắt)** bên phải ô mật khẩu để hiện/ẩn mật khẩu.
2. Nhấn nút **"Đăng nhập"** hoặc nhấn phím **Enter** trên bàn phím.
3. Nếu thông tin đúng, hệ thống sẽ chuyển bạn vào trang Tổng quan (Dashboard).
4. Nếu sai, hệ thống sẽ hiển thị thông báo lỗi màu đỏ. Hãy kiểm tra lại tên đăng nhập và mật khẩu.

### 1.3. Đăng xuất

- Nhấn nút **"Thoát"** ở góc trên bên phải màn hình để đăng xuất khỏi hệ thống.

> **💡 Lưu ý:** Phiên đăng nhập sẽ tự động hết hạn sau một khoảng thời gian. Khi đó bạn cần đăng nhập lại.

---

## 2. TỔNG QUAN DASHBOARD

Sau khi đăng nhập thành công, bạn sẽ thấy trang **Tổng quan**. Đây là nơi hiển thị toàn bộ thông tin hoạt động kinh doanh của bạn.

### 2.1. Thanh điều hướng (Navigation)

Phía trên cùng có thanh tab gồm các mục chính:

| Tab | Biểu tượng | Chức năng |
|-----|------------|-----------|
| Tổng quan | 🏠 | Xem thống kê tổng hợp |
| Bán hàng | 🛒 | Tạo đơn bán hàng (POS) |
| Nhập hàng | 🚚 | Quản lý nhập hàng từ NCC |
| Đơn hàng | 📋 | Xem danh sách đơn hàng |
| Hóa đơn | 📋 | Quản lý hóa đơn |
| Sản phẩm | 📦 | Quản lý hàng hóa |
| Danh mục | 📁 | Quản lý nhóm hàng |
| Tồn kho | 📊 | Kiểm tra tồn kho |
| Kho hàng | 🏭 | Quản lý kho |
| Bảng giá | 💰 | Quản lý bảng giá |
| Khách hàng | 👥 | Quản lý khách hàng |
| Nhà cung cấp | 🚛 | Quản lý nhà cung cấp |

Thêm 2 mục ở góc phải:
- **⚙️ Cài đặt**: Thiết lập hệ thống.
- **Avatar + Tên**: Hiển thị tên người dùng đang đăng nhập.

### 2.2. Trang Tổng quan (Overview)

Trang chính hiển thị 2 chế độ xem. Bạn chuyển đổi bằng 2 nút tab ở trên cùng:

#### 2.2.1. Tab "Tổng quan"

Hiển thị kết quả bán hàng **trong ngày hôm nay**:

- **Doanh thu**: Tổng tiền bán hàng.
- **Trả hàng**: Tổng giá trị hàng bị trả lại.
- **Doanh thu thuần**: Doanh thu sau khi trừ trả hàng (có hiển thị % so sánh với hôm qua ↑↓).
- **Đơn hàng**: Tổng số đơn hàng trong ngày.
- **Lợi nhuận gộp**: Doanh thu thuần trừ giá vốn.
- **Tỷ suất lợi nhuận**: Phần trăm lợi nhuận trên doanh thu.

**Biểu đồ cột doanh thu thuần:**
- Mặc định hiển thị **7 ngày qua**.
- Bạn có thể chọn lọc theo: Hôm nay, Hôm qua, 7 ngày qua, Tháng này, Tháng trước.

**Hoạt động gần đây:**
- Hiển thị danh sách các giao dịch mới nhất (đơn hàng, trả hàng…) kèm giá trị và thời gian.

**Top 10 hàng bán chạy:**
- Sắp xếp theo doanh thu thuần hoặc theo số lượng.
- Lọc theo: Hôm nay, 7 ngày qua, Tháng này, Tháng trước.

**Top 10 khách mua nhiều nhất:**
- Hiển thị khách hàng mua nhiều nhất theo giá trị.
- Có thể lọc theo các khoảng thời gian khác nhau.

#### 2.2.2. Tab "Báo cáo"

- Chọn **"Từ ngày"** và **"Đến ngày"** để xem báo cáo theo khoảng thời gian.
- Nhấn **"Xem báo cáo"** để tải dữ liệu.
- Nhấn **"Xuất Excel"** để tải báo cáo doanh thu ra file Excel.

Hiển thị:
- **Báo cáo doanh thu**: Tổng doanh thu, Doanh thu thuần, Số đơn hàng.
- **Giá trị tồn kho**: Tổng giá trị, Tổng số lượng, Số sản phẩm.
  - Nhấn **"Xuất"** để tải báo cáo tồn kho ra file CSV/Excel.

---

## 3. BÁN HÀNG (POS)

Đây là tính năng **quan trọng nhất** của hệ thống — nơi bạn tạo đơn bán hàng và thanh toán cho khách.

### 3.1. Giao diện bán hàng

Màn hình chia làm 2 phần:
- **Bên trái**: Danh sách sản phẩm để chọn.
- **Bên phải**: Giỏ hàng (hóa đơn hiện tại) và thông tin thanh toán.

### 3.2. Quản lý nhiều hóa đơn cùng lúc (Multi-tab)

- Hệ thống cho phép mở **tối đa 10 hóa đơn** cùng lúc.
- Phía trên giỏ hàng có các **tab hóa đơn**. Nhấn vào tab để chuyển qua lại giữa các hóa đơn.
- Nhấn nút **"+"** để tạo hóa đơn mới.
- Nhấn nút **"×"** trên tab để đóng hóa đơn (hệ thống sẽ cảnh báo nếu giỏ hàng còn sản phẩm).

> **💡 Mẹo:** Khi đang phục vụ khách A mà khách B đến, bạn có thể tạo tab hóa đơn mới phục vụ khách B mà không mất dữ liệu của khách A.

### 3.3. Tìm và thêm sản phẩm vào giỏ hàng

1. **Tìm kiếm**: Nhập tên hoặc mã sản phẩm vào ô tìm kiếm bên trái. Hệ thống tìm kiếm không dấu (ví dụ: gõ "vph" sẽ tìm "Văn phòng phẩm").
2. **Quét mã vạch**: Dùng máy quét mã vạch, con trỏ đặt tại ô tìm kiếm. Quét mã và sản phẩm sẽ tự động thêm vào giỏ.
3. **Nhấn vào sản phẩm** trong danh sách để thêm vào giỏ hàng. Nếu sản phẩm đã có trong giỏ, số lượng sẽ tự động tăng thêm 1.

### 3.4. Chỉnh sửa giỏ hàng

- **Thay đổi số lượng**: Nhấn vào ô số lượng trong giỏ hàng và nhập số mới.
- **Thay đổi đơn giá**: Nhấn vào ô đơn giá để chỉnh giá bán cho mặt hàng cụ thể.
- **Xóa sản phẩm**: Nhấn nút **"×"** bên phải mỗi sản phẩm trong giỏ.
- **Kéo thả sắp xếp**: Kéo biểu tượng ☰ để sắp xếp thứ tự sản phẩm trong giỏ.

### 3.5. Chọn khách hàng

1. Nhấn vào ô **"Khách hàng"** ở phần bên phải.
2. Gõ tên hoặc số điện thoại để tìm khách hàng có sẵn.
3. Chọn khách hàng từ danh sách gợi ý.
4. Nếu khách hàng chưa có, nhấn **"+ Thêm khách hàng"** để tạo mới ngay tại đây.

### 3.6. Chọn bảng giá

- Nhấn vào ô **"Bảng giá"** để chọn bảng giá áp dụng cho đơn hàng.
- Khi đổi bảng giá, **tất cả giá sản phẩm trong giỏ sẽ tự động cập nhật** theo bảng giá mới.

### 3.7. Chọn người bán / Kênh bán

- **Người bán (Công ty phát hành)**: Chọn công ty/cửa hàng xuất hóa đơn. Có thể thêm mới ngay trong form.
- **Kênh bán hàng**: Chọn kênh bán: Bán trực tiếp, Facebook, Instagram, hoặc Khác.

### 3.8. Giảm giá

- **Giảm giá theo %**: Nhập phần trăm giảm giá vào ô "% Giảm giá". Hệ thống sẽ tự tính số tiền giảm.
- **Giảm giá theo số tiền**: Nhập trực tiếp số tiền giảm giá.

### 3.9. Thanh toán

Hệ thống hỗ trợ **3 phương thức thanh toán**:

| Phương thức | Biểu tượng | Mô tả |
|------------|------------|-------|
| Tiền mặt | 💵 | Thanh toán bằng tiền mặt |
| Chuyển khoản | 🏦 | Chuyển khoản ngân hàng |
| Thẻ | 💳 | Quẹt thẻ |

**Với phương thức Chuyển khoản:**
- Hệ thống hiển thị mã QR VietQR để khách quét thanh toán.
- Chọn tài khoản ngân hàng nhận tiền.
- Nhấn **"Quản lý tài khoản"** để thêm/sửa/xóa tài khoản ngân hàng.

**Hoàn tất thanh toán:**
1. Nhập số tiền khách trả vào ô **"Tiền khách đưa"**.
2. Hệ thống tự động tính **tiền thừa trả lại**.
3. Nhấn nút **"Thanh toán"** để hoàn tất đơn hàng.

### 3.10. In hóa đơn

- Sau khi thanh toán, hệ thống sẽ tự động in hóa đơn (nếu đã bật tùy chọn).
- Nhấn nút **🖨 In** để in lại hóa đơn cuối cùng.

**Cài đặt in:**
- Nhấn biểu tượng **⚙️** bên cạnh nút in để mở cài đặt:
  - **Mẫu in**: Chọn mẫu hóa đơn (MIXU, Thanh Vân, Việt Hồng, Tùy chỉnh).
  - **Hàng thêm**: Thêm dòng trống vào bảng hàng (dành cho viết tay bổ sung).
  - **Số bản in**: Chọn số bản in (1-5).
  - **Hiện số thập phân**: Bật/tắt hiển thị số thập phân trên giá.
  - **Tùy chỉnh thông tin cửa hàng**: Sửa tên, địa chỉ, điện thoại, email, website, kích thước font trên hóa đơn.

### 3.11. Chế độ bán hàng

- **Bán nhanh ⚡**: Tự động in hóa đơn ngay khi thanh toán. Phù hợp bán lẻ nhanh.
- **Bán thường**: Hiển thị màn hình thành công, bạn tự chọn in hay không.

### 3.12. Trả hàng

1. Nhấn nút **"↩ Trả hàng"** trên thanh công cụ.
2. Nhập mã đơn hàng cần trả và nhấn **"Tìm"**.
3. Hệ thống hiển thị thông tin đơn hàng gốc.
4. Nhập số lượng muốn trả cho từng sản phẩm.
5. Nhấn **"Xác nhận trả hàng"** để hoàn tất.

---

## 4. NHẬP HÀNG

Quản lý tất cả các phiếu nhập hàng từ nhà cung cấp.

### 4.1. Giao diện

- **Bên trái**: Thanh lọc (Filter Sidebar).
- **Bên phải**: Bảng danh sách đơn nhập hàng.

### 4.2. Bộ lọc

- **Trạng thái**: Đã nhập hàng ✅, Đã thanh toán ✅, Thanh toán 1 phần ✅, Đã hủy.
- **Khoảng thời gian**: Chọn Từ ngày – Đến ngày.
- **Tìm kiếm**: Nhập mã đơn hoặc tên nhà cung cấp.
- Nhấn **"Xóa bộ lọc"** để reset tất cả bộ lọc.

### 4.3. Tạo đơn nhập hàng mới

1. Nhấn nút **"+ Nhập hàng"** ở góc trên bên phải.
2. Điền thông tin:
   - **Nhà cung cấp** (bắt buộc): Tìm kiếm và chọn NCC. Nhấn **"+ Thêm NCC"** nếu chưa có.
   - **Kho hàng**: Chọn kho nhập hàng vào.
   - **Ngày nhập**: Chọn ngày giờ nhập hàng.
   - **Ghi chú**: Nhập ghi chú cho đơn hàng (tùy chọn).
3. **Thêm sản phẩm:**
   - Nhấn **"+ Thêm hàng"** để thêm dòng sản phẩm.
   - Tìm và chọn sản phẩm. Nhấn **"+ Tạo mới"** nếu sản phẩm chưa có.
   - Nhập **Số lượng** và **Đơn giá nhập**.
   - Đơn vị tính (ĐVT) sẽ tự động lấy từ thông tin sản phẩm.
4. **Thanh toán trước** (tùy chọn):
   - Nhập số tiền trả trước cho NCC.
   - Chọn phương thức: Tiền mặt hoặc Chuyển khoản.
5. Nhấn **"Lưu"** để tạo đơn nhập hàng.

### 4.4. Quản lý đơn nhập hàng

Mỗi đơn nhập có các nút thao tác:

| Nút | Chức năng |
|-----|-----------|
| 👁 Xem | Xem chi tiết đơn nhập |
| ✏️ Sửa | Chỉnh sửa đơn nhập |
| ✅ Nhập kho | Xác nhận nhập kho (cập nhật tồn kho) |
| ❌ Hủy | Hủy đơn nhập |
| 🗑 Xóa | Xóa vĩnh viễn đơn nhập |

### 4.5. Xuất danh sách nhập hàng ra Excel

1. Nhấn nút **"Xuất file"**.
2. Chọn khoảng thời gian và trạng thái cần xuất.
3. Nhấn **"Xuất Excel"** để tải file.

### 4.6. Trạng thái đơn nhập

| Trạng thái | Ý nghĩa |
|-----------|---------|
| Đã nhập hàng | Đã xác nhận nhập kho, tồn kho đã cập nhật |
| Đã thanh toán | Đã thanh toán đầy đủ cho NCC |
| Thanh toán 1 phần | Đã trả một phần, còn nợ NCC |
| Đã hủy | Đơn nhập đã bị hủy |

---

## 5. ĐƠN HÀNG

Quản lý tất cả đơn hàng bán ra cho khách.

### 5.1. Xem danh sách đơn hàng

- Danh sách hiển thị: Mã đơn, Thời gian, Khách hàng, Tổng tiền, Giảm giá, Khách đã trả, Trạng thái.
- Có thể tìm kiếm theo mã đơn hoặc tên khách hàng.

### 5.2. Xem chi tiết đơn hàng

- Nhấn vào một đơn hàng để xem chi tiết các sản phẩm trong đơn.

---

## 6. HÓA ĐƠN

Quản lý toàn bộ hóa đơn bán hàng đã xuất.

### 6.1. Giao diện

Bao gồm:
- **Thanh tìm kiếm**: Tìm theo mã hóa đơn, tên khách hàng.
- **Bộ lọc thời gian**: Tháng này, Tùy chỉnh (Từ ngày – Đến ngày).
- **Lọc trạng thái**: Hoàn thành, Đã hủy, Nháp.
- **Bộ lọc nâng cao**: Người tạo, Người bán, Bảng giá, Kênh bán, Phương thức thanh toán.

### 6.2. Tạo hóa đơn mới

1. Nhấn nút **"+ Tạo mới"**.
2. Điền đầy đủ thông tin hóa đơn trong form popup.
3. Thêm các sản phẩm vào hóa đơn.
4. Nhấn **"Lưu"** để tạo hóa đơn.

### 6.3. Xem chi tiết hóa đơn

- Nhấn vào **mã hóa đơn** hoặc biểu tượng ▶ để mở rộng hàng và xem chi tiết sản phẩm trong hóa đơn.
- Chi tiết bao gồm: Mã hàng, Tên hàng, ĐVT, Số lượng, Đơn giá, Thành tiền.

### 6.4. Chỉnh sửa hóa đơn

Có 2 cách chỉnh sửa:
1. **Sửa trực tiếp**: Nhấn biểu tượng ✏️ bên cạnh hóa đơn → Mở form chỉnh sửa.
2. **Sửa trong POS**: Nhấn nút **"Sửa trong POS"** → Hệ thống chuyển sang trang Bán hàng với dữ liệu hóa đơn được tải sẵn, cho phép chỉnh sửa như tạo đơn mới.

### 6.5. In hóa đơn

- Nhấn biểu tượng **🖨** trên dòng hóa đơn.
- Hệ thống mở cửa sổ in mới với mẫu hóa đơn đầy đủ: thông tin cửa hàng, mã vạch, bảng sản phẩm, tổng tiền, chữ ký.

### 6.6. Import / Export hóa đơn

**Import từ Excel:**
1. Nhấn nút **"Import"**.
2. Chọn file Excel (.xlsx) đúng format.
3. Hệ thống tự động đọc và tạo hóa đơn từ file.

**Export ra Excel:**
1. Nhấn nút **"Xuất file"**.
2. Chọn kiểu xuất:
   - **Tổng quan**: Chỉ thông tin chính (mã, thời gian, khách hàng, tổng tiền).
   - **Chi tiết**: Đầy đủ thông tin bao gồm từng sản phẩm trong mỗi hóa đơn.

### 6.7. Xóa hóa đơn

- Nhấn biểu tượng **🗑** → Xác nhận xóa.
- ⚠️ **Hành động này không thể hoàn tác.**

---

## 7. SẢN PHẨM (HÀNG HÓA)

Quản lý toàn bộ danh mục hàng hóa của cửa hàng.

### 7.1. Giao diện

- **Bên trái**: Bộ lọc sản phẩm.
- **Bên phải**: Bảng danh sách sản phẩm với cột: Ảnh, Mã hàng, Tên hàng, ĐVT, Giá bán, Giá vốn, Tồn kho, Thời gian tạo.

### 7.2. Bộ lọc sản phẩm

| Bộ lọc | Mô tả |
|--------|-------|
| Nhóm hàng | Lọc theo danh mục sản phẩm |
| Loại hàng | Hàng hóa, Dịch vụ, Combo |
| Nhà cung cấp | Lọc theo NCC |
| Vị trí | Lọc theo vị trí kệ hàng |
| Bán trực tiếp | Tất cả / Có / Không |
| Trạng thái | Hàng đang kinh doanh / Ngừng kinh doanh |

Nhấn **"Xóa bộ lọc"** để reset.

### 7.3. Thêm sản phẩm mới

1. Nhấn nút **"+ Tạo mới"**.
2. Điền thông tin trong form:
   - **Tên hàng** (bắt buộc)
   - **Mã hàng (SKU)**: Tự động tạo hoặc nhập tay.
   - **Mã vạch (Barcode)**
   - **Nhóm hàng**: Chọn danh mục.
   - **Thương hiệu**
   - **Giá bán**, **Giá vốn**
   - **Đơn vị tính** (ĐVT)
   - **Vị trí**: Vị trí lưu trữ trong kho.
   - **Mô tả**: Mô tả chi tiết sản phẩm.
   - **Bán trực tiếp**: Cho phép xuất hiện trên màn hình POS.
   - **Trạng thái**: Đang kinh doanh / Ngừng kinh doanh.
   - **Ảnh sản phẩm**: Upload ảnh minh họa.
3. Nhấn **"Lưu"** để tạo sản phẩm.

### 7.4. Sửa sản phẩm

- Nhấn biểu tượng **✏️ (Sửa)** trên dòng sản phẩm → Form chỉnh sửa giống form thêm mới.

### 7.5. Xóa sản phẩm

- Nhấn biểu tượng **🗑 (Xóa)** → Xác nhận xóa.
- ⚠️ **Không thể xóa sản phẩm đang có trong đơn hàng hoặc tồn kho.**

### 7.6. Import sản phẩm từ Excel

1. Nhấn nút **"Import file"**.
2. Chọn file Excel (.xlsx, .xls) hoặc CSV.
3. File cần có các cột: **Mã hàng**, **Tên hàng**, Mã vạch, Thương hiệu, Giá bán, Giá vốn, ĐVT, Nhóm hàng, Loại hàng, Mô tả, Vị trí, Tồn kho.
4. Hệ thống tự động nhận diện cột dựa trên tiêu đề. Nếu mã hàng đã tồn tại, sẽ **cập nhật** thay vì tạo mới.
5. Import theo batch 100 sản phẩm/lần để đảm bảo hiệu suất.

### 7.7. Export sản phẩm ra Excel

1. Nhấn nút **"Xuất file"**.
2. Chọn định dạng: **Excel (.xlsx)** hoặc **CSV (.csv)**.
3. File xuất ra bao gồm đầy đủ thông tin sản phẩm.

### 7.8. Chọn nhiều sản phẩm

- Đánh dấu checkbox ☑ bên trái mỗi sản phẩm.
- Đánh dấu checkbox ở header để chọn tất cả.
- Sử dụng cho thao tác hàng loạt (export, xóa…).

---

## 8. DANH MỤC

Quản lý nhóm hàng (danh mục) để phân loại sản phẩm.

### 8.1. Xem danh sách danh mục

- Hiển thị bảng gồm: Tên danh mục, Danh mục cha, Số lượng sản phẩm, Thao tác.

### 8.2. Thêm danh mục mới

1. Nhấn nút **"+ Thêm danh mục"**.
2. Nhập **Tên danh mục** (bắt buộc).
3. Chọn **Danh mục cha** nếu là danh mục con (tùy chọn).
4. Nhập **Mô tả** (tùy chọn).
5. Nhấn **"Lưu"**.

### 8.3. Sửa / Xóa danh mục

- **Sửa**: Nhấn biểu tượng ✏️ → Chỉnh sửa thông tin → Lưu.
- **Xóa**: Nhấn biểu tượng 🗑 → Xác nhận.
- ⚠️ **Không thể xóa danh mục đang chứa sản phẩm.**

---

## 9. TỒN KHO

Theo dõi và quản lý số lượng tồn kho của tất cả sản phẩm.

### 9.1. Giao diện

- **Bên trái**: Bộ lọc (Kho hàng, Công ty, Thời gian).
- **Bên phải**: Bảng báo cáo tồn kho với cột: Mã hàng, Tên hàng, ĐVT, Đầu kỳ (SL + GT), Nhập kho (SL + GT), Xuất kho (SL + GT), Cuối kỳ (SL + GT), Đơn giá.

### 9.2. Các chỉ số quan trọng

- **Đầu kỳ**: Số lượng và giá trị tồn kho đầu kỳ.
- **Nhập kho**: Số lượng và giá trị hàng nhập trong kỳ.
- **Xuất kho**: Số lượng và giá trị hàng xuất (bán) trong kỳ.
- **Cuối kỳ**: Số lượng và giá trị tồn kho cuối kỳ.

### 9.3. Cảnh báo hết hàng

- Hệ thống hiển thị cảnh báo khi có sản phẩm **hết tồn kho** (tồn = 0).
- Bộ lọc nhanh: **Tất cả** | **Còn hàng** | **Hết hàng**.

### 9.4. Nhập kho

1. Nhấn nút **"+ Nhập kho"**.
2. Chọn **Kho hàng** đích.
3. Chọn **Sản phẩm**.
4. Nhập **Số lượng nhập**.
5. Nhập **Ghi chú** (tùy chọn).
6. Nhấn **"Xác nhận"**.

### 9.5. Xuất kho

1. Nhấn nút **"- Xuất kho"**.
2. Thao tác tương tự Nhập kho nhưng chọn loại **Xuất kho**.
3. ⚠️ Không thể xuất quá số lượng tồn kho hiện có.

### 9.6. Điều chỉnh tồn kho

1. Nhấn nút **"⚙ Điều chỉnh"**.
2. Chọn sản phẩm và nhập **số lượng tồn thực tế**.
3. Hệ thống sẽ tự động tính chênh lệch và điều chỉnh.

### 9.7. Import tồn kho từ Excel

1. Nhấn nút **"Import"**.
2. Chọn file Excel có format đúng:
   - **Format 1 (Báo cáo)**: Cần có cột "Nhập kho" và "Xuất kho".
   - **Format 2 (Đơn giản)**: Cần có cột "Số lượng" hoặc "Tồn kho".
3. Hệ thống tự động đọc và tạo các phiếu nhập/xuất/điều chỉnh tương ứng.

### 9.8. Export tồn kho ra Excel

1. Nhấn **"Xuất file"**.
2. Chọn **Excel (.xlsx)** hoặc **CSV (.csv)**.
3. Bảng xuất ra có header kép (merge cells): Đầu kỳ/Nhập kho/Xuất kho/Cuối kỳ, mỗi mục có SL và GT.

---

## 10. KHO HÀNG

Quản lý danh sách các kho hàng của công ty.

### 10.1. Xem danh sách kho

- Bảng hiển thị: Tên kho, Mã kho, Địa chỉ.

### 10.2. Thêm kho hàng mới

1. Nhấn nút **"+ Thêm kho"**.
2. Nhập: **Tên kho** (bắt buộc), **Mã kho**, **Địa chỉ**.
3. Nhấn **"Lưu"**.

### 10.3. Sửa / Xóa kho hàng

- **Sửa**: Nhấn ✏️ → Chỉnh sửa → Lưu.
- **Xóa**: Nhấn 🗑 → Xác nhận.
- ⚠️ **Không thể xóa kho đang có hàng tồn.**

---

## 11. BẢNG GIÁ

Quản lý nhiều bảng giá khác nhau cho các nhóm khách hàng hoặc chiến dịch bán hàng.

### 11.1. Xem danh sách bảng giá

- Hiển thị: Tên bảng giá, Mã, Trạng thái (Mặc định/Hoạt động).

### 11.2. Tạo bảng giá mới

1. Nhấn nút **"+ Tạo bảng giá"**.
2. Nhập: **Tên bảng giá**, **Mã bảng giá**.
3. Chọn **Mặc định** nếu muốn áp dụng làm bảng giá chính.
4. Thêm từng sản phẩm và giá tương ứng vào bảng giá.
5. Nhấn **"Lưu"**.

### 11.3. Cách hoạt động

- Khi bán hàng (POS), bạn chọn bảng giá → Giá sản phẩm sẽ tự động lấy từ bảng giá đã chọn.
- Nếu sản phẩm không có giá trong bảng giá, sẽ dùng giá mặc định của sản phẩm.

> **💡 Ví dụ:** Tạo bảng giá "Giá sỉ" với giá thấp hơn → Khi bán sỉ chọn bảng giá này → Giá tự động giảm.

---

## 12. KHÁCH HÀNG

Quản lý toàn bộ thông tin khách hàng.

### 12.1. Giao diện

- **Bên trái**: Thanh lọc (nhóm khách, loại khách, giới tính, trạng thái, doanh số, nợ…).
- **Bên phải**: Bảng danh sách khách hàng.

### 12.2. Bộ lọc khách hàng

| Bộ lọc | Mô tả |
|--------|-------|
| Nhóm khách | Lọc theo nhóm (VIP, Thường…) |
| Ngày tạo | Lọc theo khoảng thời gian |
| Loại khách | Cá nhân / Công ty |
| Giới tính | Nam / Nữ |
| Trạng thái | Đang hoạt động / Ngừng hoạt động |
| Tổng bán | Lọc theo khoảng doanh số |
| Nợ hiện tại | Lọc theo khoảng nợ |
| Số ngày nợ | Lọc theo số ngày nợ |

### 12.3. Thêm khách hàng mới

1. Nhấn nút **"+ Thêm khách hàng"**.
2. Điền thông tin:

**Thông tin cơ bản:**
- Mã khách hàng, Tên (bắt buộc), Điện thoại, Email, Địa chỉ.

**Thông tin bổ sung:**
- Người liên hệ, Chức vụ, Fax, Website.

**Địa chỉ chi tiết:**
- Đường, Phường/Xã, Quận/Huyện, Thành phố, Quốc gia, Mã bưu điện.

**Thông tin ngân hàng:**
- Tên ngân hàng, Số tài khoản, Chi nhánh.

**Phân loại:**
- Loại khách (Cá nhân/Doanh nghiệp), Ngành nghề, Nhóm khách, Mức ưu tiên, Nguồn khách.

**Tài chính:**
- Hạn mức tín dụng, Điều khoản thanh toán.
- Mã số thuế.

3. Nhấn **"Lưu"** để tạo khách hàng.

### 12.4. Xem chi tiết khách hàng

- Nhấn vào biểu tượng ▶ bên cạnh tên khách hàng để mở rộng xem chi tiết.
- Chi tiết bao gồm: Thông tin liên hệ, Lịch sử mua hàng, Công nợ, Thanh toán.

### 12.5. Quản lý công nợ khách hàng

- Bảng khách hàng hiển thị cột: **Nợ hiện tại**, **Số ngày nợ**, **Tổng bán**, **Tổng bán trừ trả hàng**.
- Nhấn vào khách hàng để xem lịch sử thanh toán và thực hiện:
  - **Ghi nhận thanh toán**: Nhập số tiền khách trả nợ.
  - **Xuất báo cáo công nợ**: Xuất chi tiết nợ ra file.

### 12.6. Import khách hàng từ file

1. Nhấn nút **"Import"**.
2. Chọn file: Hỗ trợ **Excel (.xlsx, .xls)**, **CSV**, **PDF**.
3. Hệ thống tự động nhận diện cột và import. Nếu trùng mã/SĐT sẽ cập nhật thay vì tạo mới.
4. Hiển thị kết quả: X tạo mới, Y cập nhật, Z thất bại.

### 12.7. Export khách hàng

- Nhấn nút **"Xuất file"** để tải danh sách khách hàng ra Excel.

---

## 13. NHÀ CUNG CẤP

Quản lý danh sách nhà cung cấp hàng hóa.

### 13.1. Xem danh sách NCC

Bảng hiển thị: Mã NCC, Tên, Email, Điện thoại, Địa chỉ, Nợ hiện tại, Thao tác.

### 13.2. Thêm NCC mới

1. Nhấn nút **"+ Thêm NCC"**.
2. Nhập thông tin: Tên (bắt buộc), Mã, Điện thoại, Email, Địa chỉ, Khu vực, Phường/Xã, Nhóm NCC, Ghi chú, Công ty, Mã số thuế.
3. Nhấn **"Lưu"**.

### 13.3. Quản lý công nợ NCC

- Xem nợ hiện tại của từng NCC.
- Nhấn vào NCC để xem lịch sử thanh toán.
- **Ghi nhận thanh toán**: Nhập số tiền trả cho NCC.
- **Sửa/Xóa thanh toán**: Chỉnh sửa hoặc xóa bản ghi thanh toán đã lưu.

### 13.4. Sửa / Xóa NCC

- **Sửa**: Nhấn ✏️ → Chỉnh sửa → Lưu.
- **Xóa**: Nhấn 🗑 → Xác nhận.
- ⚠️ **Không thể xóa NCC đang có đơn nhập hàng.**

---

## 14. BÁO CÁO

Xem và xuất các báo cáo tổng hợp.

### 14.1. Truy cập

- Trên trang Tổng quan → Nhấn tab **"Báo cáo"**.

### 14.2. Báo cáo doanh thu

1. Chọn **Từ ngày** – **Đến ngày**.
2. Nhấn **"Xem báo cáo"**.
3. Hiển thị:
   - Tổng doanh thu
   - Doanh thu thuần
   - Số đơn hàng
4. Nhấn **"Xuất Excel"** để tải file.

### 14.3. Báo cáo tồn kho

Tự động hiển thị khi xem báo cáo:
- Tổng giá trị tồn kho
- Tổng số lượng
- Số sản phẩm
- Nhấn **"Xuất"** để tải file CSV.

---

## 15. CÀI ĐẶT

Thiết lập thông tin hệ thống.

### 15.1. Truy cập

- Nhấn biểu tượng **⚙️** ở góc phải trên header.

### 15.2. Các mục cài đặt

#### 🏢 Thông tin công ty
| Trường | Mô tả |
|--------|-------|
| Tên công ty | Tên hiển thị trên hóa đơn |
| Địa chỉ | Địa chỉ công ty |
| Số điện thoại | SĐT liên hệ |
| Email | Email công ty |
| Mã số thuế | MST của công ty |

#### 📋 Cài đặt hóa đơn
| Trường | Mô tả |
|--------|-------|
| Tiền tố hóa đơn | Ký hiệu đầu mã hóa đơn (mặc định: "HD") |
| Thuế VAT (%) | Phần trăm thuế VAT (mặc định: 10%) |
| Đơn vị tiền tệ | VND hoặc USD |
| Tự động in hóa đơn | Bật/tắt tự động in sau thanh toán |

#### 📦 Cài đặt tồn kho
| Trường | Mô tả |
|--------|-------|
| Ngưỡng cảnh báo tồn kho thấp | Số lượng tối thiểu trước khi cảnh báo (mặc định: 10) |

### 15.3. Lưu cài đặt

- Sau khi chỉnh sửa, nhấn nút **"💾 Lưu cài đặt"** ở góc dưới bên phải.
- Hệ thống hiển thị thông báo thành công/thất bại.

---

## 16. MẸO SỬ DỤNG & CÂU HỎI THƯỜNG GẶP

### 💡 Mẹo sử dụng

1. **Phím tắt**: Nhấn **Enter** tại ô tìm kiếm để lọc nhanh.
2. **Multi-tab POS**: Mở nhiều hóa đơn cùng lúc khi bán hàng đông khách.
3. **Quét mã vạch**: Kết nối máy quét mã vạch USB → đặt con trỏ vào ô tìm kiếm → quét mã.
4. **Import từ Excel**: Chuẩn bị file Excel đúng format để import hàng loạt sản phẩm, khách hàng, hóa đơn.
5. **Chọn bảng giá**: Tạo nhiều bảng giá (sỉ, lẻ, VIP…) để bán với giá khác nhau cho từng đối tượng.
6. **Sao lưu dữ liệu**: Thường xuyên xuất file Excel các danh mục quan trọng để sao lưu.

### ❓ Câu hỏi thường gặp

**Q: Tôi quên mật khẩu đăng nhập?**
> Liên hệ quản trị viên hệ thống để được reset mật khẩu.

**Q: Không xóa được sản phẩm?**
> Sản phẩm đang có trong đơn hàng hoặc còn tồn kho. Hãy kiểm tra và xử lý hết liên quan trước khi xóa.

**Q: Không in được hóa đơn?**
> Kiểm tra trình duyệt có cho phép popup (cửa sổ bật lên) không. Vào cài đặt trình duyệt → Cho phép popup cho website hệ thống.

**Q: Giá sản phẩm không đúng khi bán hàng?**
> Kiểm tra bảng giá đang chọn trong POS. Đổi sang bảng giá đúng hoặc sửa giá trực tiếp trên dòng sản phẩm trong giỏ hàng.

**Q: Import Excel bị lỗi?**
> Kiểm tra file Excel có đúng format không. Dòng header cần có các cột chuẩn (Mã hàng, Tên hàng…). Đảm bảo không có ký tự đặc biệt trong dữ liệu.

**Q: Tồn kho hiển thị sai?**
> Vào mục **Tồn kho** → Nhấn **"Điều chỉnh"** → Nhập lại số lượng thực tế → Lưu.

**Q: Làm sao để tạo mã QR thanh toán?**
> Khi thanh toán chọn phương thức **"Chuyển khoản"** → Hệ thống tự động tạo mã QR VietQR. Khách hàng quét mã để chuyển khoản.

**Q: Hệ thống bị chậm/lỗi?**
> - Thử **F5** (Refresh) trình duyệt.
> - Xóa cache trình duyệt: **Ctrl + Shift + Delete**.
> - Kiểm tra kết nối internet.
> - Nếu vẫn lỗi, liên hệ bộ phận kỹ thuật.

---

## 📞 LIÊN HỆ HỖ TRỢ

Nếu bạn gặp vấn đề trong quá trình sử dụng, vui lòng liên hệ:

- **Hotline:** 0932.542.168
- **Email:** mixuoffice@gmail.com
- **Website:** mixuoffice.com

---

> 📌 **Tài liệu này được cập nhật thường xuyên theo phiên bản hệ thống. Vui lòng kiểm tra phiên bản mới nhất khi có thay đổi.**

*© 2026 MIXU Office Supplies - Powered by VAI-Studio*
