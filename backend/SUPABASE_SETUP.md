# Cách lấy Supabase Service Role Key

## Bước 1: Vào Supabase Dashboard
1. Truy cập: https://supabase.com/dashboard
2. Chọn project của bạn

## Bước 2: Lấy Service Role Key
1. Vào **Settings** (⚙️) ở sidebar bên trái
2. Chọn **API**
3. Tìm phần **Project API keys**
4. Copy **`service_role`** key (⚠️ KHÔNG phải `anon` key)

## Bước 3: Cập nhật file .env
Mở file `backend/.env` và cập nhật:

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHgiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjg5MDAwMDAwLCJleHAiOjIwMDQ1NzYwMDB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
PORT=3000
```

## ⚠️ Lưu ý quan trọng:
- **Service Role Key** có quyền FULL ACCESS vào database
- **KHÔNG BAO GIỜ** commit key này lên Git
- **KHÔNG BAO GIỜ** dùng key này ở frontend (chỉ dùng ở backend)
- File `.env` đã được thêm vào `.gitignore`

## Bước 4: Restart Backend
```bash
cd backend
npm run start:dev
```

## Bước 5: Test Login
- Username: `admin`
- Password: `admin123`

---

## Tại sao cần Service Role Key?

- **Anon Key**: Chỉ có quyền hạn chế, tuân theo Row Level Security (RLS) policies
- **Service Role Key**: Có quyền FULL ACCESS, bỏ qua RLS - cần thiết cho backend authentication

Backend cần Service Role Key để:
1. Đọc bảng `app_user` (chứa password hash)
2. Đọc bảng `user_role` và `role`
3. Tạo/cập nhật user khi cần
