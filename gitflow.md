# Git Flow Guide (gitflow.md)

Tài liệu này là “quy trình Git chuẩn” để bạn làm project nhiều chức năng (BE/FE, Prisma, Docker) mà **không mất code** và dễ hợp nhất nhánh.

---

## 1) Branch chuẩn nên dùng

- **main**: nhánh ổn định để deploy/production
- **develop**: nhánh tích hợp (integration) để gom feature và test
- **feature/***: nhánh làm từng chức năng
- **hotfix/***: sửa lỗi gấp trên production
- *(tuỳ chọn)* **release/***: chuẩn bị phát hành (khi team lớn)

Khuyến nghị: luôn merge theo luồng

`feature → develop → main`

---

## 2) Quy tắc đặt tên nhánh

- `feature/auth-login`
- `feature/products-crud`
- `feature/categories-api`
- `hotfix/fix-login-401`
- `release/v1.2.0`

---

## 3) Setup ban đầu (1 lần)

```bash
git checkout main
git pull origin main

# tạo develop từ main (nếu chưa có)
git checkout -b develop
git push -u origin develop
```

---

## 4) Workflow làm 1 chức năng (feature branch)

### Bước A — Tạo nhánh feature từ develop

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<ten-chuc-nang>
```

### Bước B — Code + commit nhỏ, rõ ràng

```bash
git status
git add .
git commit -m "feat: <mo-ta-ngan>"
```

Gợi ý message:
- `feat: add products CRUD API`
- `fix: handle 401 auth middleware`
- `chore: update env example`
- `refactor: split service layer`

### Bước C — Push feature lên remote

```bash
git push -u origin feature/<ten-chuc-nang>
```

---

## 5) Cách hợp nhất nhiều nhánh (merge) KHÔNG mất code

> Nguyên tắc: **merge về develop trước**, test ổn mới lên main.

### Merge feature 1 vào develop

```bash
git checkout develop
git pull origin develop
git merge feature/auth-login
```

### Merge feature 2 vào develop

```bash
git merge feature/products-crud
```

Nếu có conflict: xử lý, rồi:

```bash
git add .
git commit -m "chore: resolve merge conflicts"
```

Cuối cùng push:

```bash
git push origin develop
```

---

## 6) Khi nào merge develop → main?

Khi develop đã:
- chạy được (docker up ok)
- test API ok
- FE gọi API ok
- migration prisma đã ổn

```bash
git checkout main
git pull origin main
git merge develop
git push origin main
```

---

## 7) Quy trình sửa lỗi gấp (hotfix)

Khi lỗi đang nằm trên production (main):

```bash
git checkout main
git pull origin main
git checkout -b hotfix/<ten-loi>

# sửa lỗi
git add .
git commit -m "fix: <mo-ta-loi>"
git push -u origin hotfix/<ten-loi>
```

Sau đó merge:

```bash
git checkout main
git merge hotfix/<ten-loi>
git push origin main

git checkout develop
git pull origin develop
git merge hotfix/<ten-loi>
git push origin develop
```

> Lưu ý: luôn merge hotfix vào **cả main và develop** để không bị “mất” bản fix khi phát triển tiếp.

---

## 8) Xử lý conflict (mẫu nhanh)

Khi Git báo conflict:
1. Mở file có conflict
2. Tìm đoạn:

```text
<<<<<<< HEAD
... code nhánh hiện tại ...
=======
... code nhánh đang merge vào ...
>>>>>>> feature/xxx
```

3. Giữ logic cần thiết (thường là giữ cả 2 nếu là 2 chức năng)
4. Xoá các marker `<<<<<<<`, `=======`, `>>>>>>>`
5. Lưu file rồi:

```bash
git add <file>
git commit -m "chore: resolve conflict"
```

---

## 9) Prisma migrations (rất hay gây lỗi merge)

### Quy tắc team nên thống nhất

- **Không sửa thủ công** file migration đã commit.
- Mỗi thay đổi schema: tạo migration mới.

```bash
npx prisma migrate dev --name <ten_migration>
```

- Commit cả thư mục migration mới + schema:

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "chore(prisma): add migration <name>"
```

### Nếu gặp lỗi kiểu:
`untracked files would be overwritten by merge`

Giải quyết nhanh:

```bash
rm backend/prisma/migrations/migration_lock.toml
git pull
```

*(Chỉ xoá khi file đó không phải thứ bạn muốn giữ local. Nếu cần giữ, hãy move tạm rồi so sánh.)*

---

## 10) Docker / ENV (để merge không “vỡ”)

- Luôn có file mẫu: `.env.example`
- Không commit `.env` thật

Gợi ý:
- FE: `VITE_API_URL=...`
- BE: `DATABASE_URL=...`, `JWT_SECRET=...`

---

## 11) Checklist trước khi merge vào develop

- [ ] `git status` sạch
- [ ] `git pull origin develop` mới nhất
- [ ] Build/Run docker OK
- [ ] API endpoint chạy OK
- [ ] Prisma migrate OK (nếu có đổi schema)
- [ ] Không để file rác/secret vào git

---

## 12) Lệnh nhanh hay dùng

```bash
# xem branch
git branch -a

# xem lịch sử ngắn
git log --oneline --graph --decorate --all

# xem file nào đang đổi
git status

# cập nhật nhánh hiện tại
git pull

# đẩy nhánh
git push

# merge nhánh A vào nhánh hiện tại
git merge <branch>

# huỷ merge đang conflict (nếu muốn làm lại)
git merge --abort
```

---

## 13) Flow khuyến nghị cho project của bạn (Kiot-style features)

Ví dụ bạn làm 2 chức năng:

- `feature/categories`
- `feature/products`

Luồng chuẩn:

1. Tạo 2 feature từ develop
2. Làm xong push
3. Merge lần lượt vào develop
4. Test tổng thể
5. Merge develop → main

---

**Ghi nhớ 1 câu:**
> *Feature nhỏ gộp về develop trước; ổn rồi mới đưa lên main.*
