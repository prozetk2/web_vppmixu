# Cải Tiến Tìm Kiếm Sản Phẩm

## Vấn đề trước đây

Khi tìm kiếm "kệ", hệ thống cũng hiện "kem", "kẹo", v.v. vì:
- Sau khi bỏ dấu: "kệ" → "ke"
- Tìm kiếm substring: "ke" có trong "kem", "keo", "kep"...

## Giải pháp mới

### 1. Tìm kiếm thông minh với điểm số ưu tiên

Hệ thống giờ đây sắp xếp kết quả theo độ liên quan:

| Loại khớp | Điểm | Ví dụ |
|-----------|------|-------|
| **Khớp chính xác** | 1000 | Gõ "kệ" → "Kệ" lên đầu |
| **Bắt đầu bằng** | 500 | Gõ "kệ" → "Kệ sách", "Kệ tivi" |
| **Đầu từ khớp** | 300 | Gõ "kệ" → "Bộ kệ gỗ" |
| **Tất cả từ khóa** | 200 | Gõ "kệ gỗ" → "Kệ sách gỗ" |
| **Chứa từ khóa** | 100 | Gõ "kệ" → "Kem" (điểm thấp nhất) |

### 2. Tìm kiếm đa từ khóa

- Gõ "but chi xanh" → Tìm sản phẩm có cả 3 từ "but", "chi", "xanh"
- Gõ "vo 200 trang" → Tìm vở có "200" và "trang"

### 3. Bỏ dấu tiếng Việt thông minh

```javascript
const removeAccents = (str: string) => {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
};
```

- Gõ "dien thoai" → Tìm "Điện thoại"
- Gõ "vo" → Tìm "Vở", "Vỏ"
- Gõ "but" → Tìm "Bút"

## Kết quả

### Trước khi cải tiến:
```
Tìm "kệ":
1. Kem
2. Kẹo
3. Kệ sách
4. Kệ tivi
```

### Sau khi cải tiến:
```
Tìm "kệ":
1. Kệ (khớp chính xác - 1000 điểm)
2. Kệ sách (bắt đầu bằng - 500 điểm)
3. Kệ tivi (bắt đầu bằng - 500 điểm)
4. Bộ kệ gỗ (đầu từ khớp - 300 điểm)
5. Kem (chứa từ khóa - 100 điểm)
```

## Files đã cập nhật

1. ✅ `frontend/src/components/sales/POSPage.tsx` - Trang bán hàng chính
2. ✅ `frontend/src/components/pos/POSPage.tsx` - Trang POS đơn giản

## Cách sử dụng

Không cần thay đổi gì! Tìm kiếm như bình thường:
- Gõ tên sản phẩm (có hoặc không dấu)
- Gõ mã SKU
- Gõ barcode
- Gõ tên danh mục

Kết quả sẽ tự động được sắp xếp theo độ liên quan!

## Lưu ý kỹ thuật

- Sử dụng `useMemo` để tối ưu hiệu năng
- Tìm kiếm không phân biệt hoa thường
- Tìm kiếm không phân biệt dấu tiếng Việt
- Hỗ trợ tìm kiếm nhiều từ khóa cách nhau bởi khoảng trắng
