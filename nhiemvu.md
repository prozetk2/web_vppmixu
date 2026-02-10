# Hướng dẫn triển khai tính năng Upload và Hiển thị hình ảnh hàng hóa (Sử dụng Supabase Storage)

Tài liệu này hướng dẫn các bước để tích hợp tính năng tải lên hình ảnh cho hàng hóa sử dụng **Supabase Storage**.

## 1. Cấu hình Supabase (Trong Dashboard của Supabase)

### Bước 1.1: Tạo Buckets
1. Truy cập vào dự án Supabase của bạn.
2. Vào mục **Storage** -> **Create a new bucket**.
3. Đặt tên là `product-images`.
4. Chọn chế độ **Public** (để có thể truy cập ảnh qua URL mà không cần token).

### Bước 1.2: Thiết lập Policies (Quy định quyền)
Nếu bạn muốn bảo mật, hãy thiết lập Policy để chỉ người dùng có `service_role` (Backend) mới được upload, nhưng mọi người đều được xem (SELECT). Tuy nhiên, vì là bucket Public, phần xem đã được mặc định.

---

## 2. Cấu hình Back-end (NestJS)

### Bước 2.1: Cập nhật Supabase Service
Sử dụng `SupabaseService` đã có sẵn trong `backend/src/supabase/` để tương tác với Storage.

### Bước 2.2: Tạo Upload Controller & Service
Tạo endpoint: `POST /upload/product-image`
- Nhận file từ Frontend thông qua `FileInterceptor`.
- Sử dụng `supabase.storage.from('product-images').upload()` để đẩy file lên Supabase.
- Lấy URL công khai: `supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl`.
- Trả URL này về cho Frontend.

### Bước 2.3: Cập nhật Products Service
- Khi `create` hoặc `update` sản phẩm, lưu URL nhận được vào cột `images` trong bảng `Product`.

---

## 3. Cấu hình Front-end (React)

### Bước 3.1: Cập nhật API Service (`frontend/src/services/api.ts`)
Thêm hàm upload gọi đến backend:
```typescript
uploadImage: (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload/product-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}
```

### Bước 3.2: Cập nhật ProductForm.tsx
- Thêm input chọn ảnh.
- Khi người dùng chọn ảnh -> Gọi API upload lên Backend -> Backend đẩy lên Supabase -> Nhận URL trả về và lưu vào form.
- Hiển thị xem trước ảnh (Preview).

### Bước 3.3: Cập nhật ProductList.tsx
- Hiển thị ảnh sản phẩm trong danh sách bằng thẻ `<img>` với URL đã lưu.

---

## 4. Ưu điểm khi dùng Supabase Storage
1. **Tiết kiệm dung lượng server**: Không lo đầy ổ cứng của server chạy backend.
2. **CDN Tốc độ cao**: Hình ảnh được cung cấp bởi hạ tầng của Supabase nên tải nhanh hơn.
3. **Dễ bảo trì**: Không cần quan tâm đến việc sao lưu dữ liệu file vật lý.

---

**Gợi ý lộ trình thực hiện:**
1. Tạo bucket `product-images` trên Supabase Dashboard.
2. Viết logic upload trong Backend.
3. Gắn giao diện chọn ảnh vào Frontend.
