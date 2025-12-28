# AWS Lightsail Deployment Guide

Hướng dẫn deploy ứng dụng web_vppmixu lên AWS Lightsail.

## 📋 Điều kiện tiên quyết

- [x] Docker Desktop đã cài
- [x] AWS Account với $100 credits
- [ ] AWS CLI đã cài ([Download](https://aws.amazon.com/cli/))

---

## 🚀 BƯỚC 1: Cài AWS CLI

### Windows
```powershell
# Download và cài đặt từ:
# https://awscli.amazonaws.com/AWSCLIV2.msi
```

### Cấu hình AWS CLI
```bash
aws configure
```
Nhập:
- AWS Access Key ID: (lấy từ AWS Console → IAM → Users → Create access key)
- AWS Secret Access Key: (lấy cùng với Access Key)
- Default region: `ap-southeast-1` (Singapore - gần VN nhất)
- Default output format: `json`

---

## 🚀 BƯỚC 2: Install Lightsail Plugin

```bash
# Cài Lightsail Control Plugin
aws lightsail help
```

---

## 🚀 BƯỚC 3: Tạo Container Service trên Lightsail

### 3.1 Qua AWS Console (Dễ hơn)
1. Đăng nhập: https://lightsail.aws.amazon.com
2. Click **"Containers"** → **"Create container service"**
3. Chọn:
   - **Region**: Singapore (`ap-southeast-1`)
   - **Capacity**: Nano ($7/month) - đủ cho 3-4 users
   - **Service name**: `vppmixu-api`
4. Click **"Create container service"**

### 3.2 Hoặc qua CLI
```bash
aws lightsail create-container-service \
  --service-name vppmixu-api \
  --power nano \
  --scale 1 \
  --region ap-southeast-1
```

---

## 🚀 BƯỚC 4: Build & Push Docker Images

### 4.1 Build Backend Image
```bash
cd c:\Hien\nhan_du_an\web_vpp\web_vppmixu\backend

# Build image
docker build -t vppmixu-backend:latest .
```

### 4.2 Build Frontend Image
```bash
cd c:\Hien\nhan_du_an\web_vpp\web_vppmixu\frontend

# Tạo file .env.production với API URL
echo VITE_API_URL=https://vppmixu-api.xxxxxx.ap-southeast-1.cs.amazonlightsail.com > .env.production

# Build image
docker build -t vppmixu-frontend:latest .
```

### 4.3 Push to Lightsail
```bash
# Push backend
aws lightsail push-container-image \
  --service-name vppmixu-api \
  --label backend \
  --image vppmixu-backend:latest \
  --region ap-southeast-1

# Push frontend
aws lightsail push-container-image \
  --service-name vppmixu-api \
  --label frontend \
  --image vppmixu-frontend:latest \
  --region ap-southeast-1
```

---

## 🚀 BƯỚC 5: Deploy Container

### 5.1 Tạo file deployment config

Tạo file `containers.json`:
```json
{
  "backend": {
    "image": ":vppmixu-api.backend.X",
    "ports": {
      "3000": "HTTP"
    },
    "environment": {
      "NODE_ENV": "production",
      "DATABASE_URL": "YOUR_SUPABASE_DATABASE_URL",
      "DIRECT_URL": "YOUR_SUPABASE_DIRECT_URL",
      "JWT_SECRET": "YOUR_JWT_SECRET",
      "JWT_EXPIRES_IN": "7d",
      "SUPABASE_URL": "YOUR_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY": "YOUR_SUPABASE_KEY"
    }
  }
}
```

Tạo file `public-endpoint.json`:
```json
{
  "containerName": "backend",
  "containerPort": 3000,
  "healthCheck": {
    "path": "/health",
    "intervalSeconds": 30
  }
}
```

### 5.2 Deploy
```bash
aws lightsail create-container-service-deployment \
  --service-name vppmixu-api \
  --containers file://containers.json \
  --public-endpoint file://public-endpoint.json \
  --region ap-southeast-1
```

---

## 🚀 BƯỚC 6: Kiểm tra Deployment

```bash
# Xem trạng thái
aws lightsail get-container-services \
  --service-name vppmixu-api \
  --region ap-southeast-1
```

Sau khi deploy xong, URL sẽ có dạng:
```
https://vppmixu-api.xxxxxx.ap-southeast-1.cs.amazonlightsail.com
```

---

## 💰 Chi phí ước tính

| Service | Giá |
|---------|-----|
| Lightsail Nano | $7/tháng |
| **Tổng** | **~$7/tháng** |

Với $100 credits, bạn có thể chạy **~14 tháng miễn phí**!

---

## ⚠️ Lưu ý quan trọng

1. **KHÔNG commit file .env** chứa secrets lên git
2. Thay thế các giá trị `YOUR_*` bằng giá trị thực từ Supabase
3. Frontend có thể deploy trên Vercel/Netlify miễn phí (khuyến nghị)

---

## 🔗 Tùy chọn: Deploy Frontend trên Vercel (Miễn phí)

Thay vì deploy frontend lên Lightsail, bạn có thể deploy miễn phí trên Vercel:

1. Push code lên GitHub
2. Đăng nhập https://vercel.com
3. Import project từ GitHub
4. Thêm environment variable: `VITE_API_URL=https://your-lightsail-url`
5. Deploy!

**Ưu điểm**: Miễn phí, CDN toàn cầu, tự động deploy khi push code.
