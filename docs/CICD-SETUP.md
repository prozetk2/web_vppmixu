# 🚀 Hướng dẫn Setup CI/CD Auto Deploy - Chi tiết từng bước

## 📖 Mục lục
1. [Giới thiệu](#giới-thiệu)
2. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
3. [Chuẩn bị Server](#chuẩn-bị-server)
4. [Setup SSH Key](#setup-ssh-key)
5. [Cấu hình GitHub Secrets](#cấu-hình-github-secrets)
6. [Deploy lần đầu](#deploy-lần-đầu)
7. [Test CI/CD](#test-cicd)
8. [Troubleshooting](#troubleshooting)
9. [Nâng cao](#nâng-cao)

---

## Giới thiệu

### CI/CD là gì?
- **CI (Continuous Integration)**: Tự động kiểm tra code mỗi khi có thay đổi
- **CD (Continuous Deployment)**: Tự động deploy code lên server khi pass hết tests

### Workflow của chúng ta
```
Developer push code → GitHub → GitHub Actions → SSH vào Server → Pull code → Build Docker → Restart containers
```

### Lợi ích
✅ Không cần SSH vào server thủ công mỗi lần deploy  
✅ Giảm thiểu lỗi do deploy thủ công  
✅ Deploy nhanh chóng, nhất quán  
✅ Có log đầy đủ mỗi lần deploy  

---

## Yêu cầu hệ thống

### Trên máy local (máy dev)
- Git đã cài đặt
- SSH client (có sẵn trên Linux/Mac, Windows dùng Git Bash hoặc WSL)
- Quyền push lên GitHub repo

### Trên Server (VPS/Cloud)
- **Hệ điều hành**: Ubuntu 20.04+ / Debian / CentOS (khuyến nghị Ubuntu)
- **RAM**: Tối thiểu 2GB (khuyến nghị 4GB+)
- **Disk**: Tối thiểu 20GB trống
- **Network**: Có kết nối internet, port 22 (SSH) mở
- **Quyền**: Root hoặc user có sudo

---

## Chuẩn bị Server

### Bước 1: Cài đặt Docker

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Cài đặt dependencies
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Thêm Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Thêm Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài đặt Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Kiểm tra Docker đã cài thành công
docker --version
# Output mong đợi: Docker version 24.x.x, build xxxxx
```

### Bước 2: Cài đặt Docker Compose

```bash
# Tải Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Cấp quyền thực thi
sudo chmod +x /usr/local/bin/docker-compose

# Kiểm tra
docker-compose --version
# Output mong đợi: Docker Compose version v2.x.x
```

### Bước 3: Thêm user vào Docker group (optional nhưng khuyến nghị)

```bash
# Thêm user hiện tại vào docker group
sudo usermod -aG docker $USER

# Logout và login lại để áp dụng
# Hoặc chạy:
newgrp docker

# Test không cần sudo
docker ps
# Nếu chạy được là OK!
```

### Bước 4: Cài đặt Git

```bash
# Cài Git
sudo apt install -y git

# Kiểm tra
git --version
# Output: git version 2.x.x
```

### Bước 5: Cấu hình Git trên Server

```bash
# Set git config
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Tạo thư mục cho project
sudo mkdir -p /var/www/vppmixu
sudo chown -R $USER:$USER /var/www/vppmixu
cd /var/www/vppmixu
```

---

## Setup SSH Key

### Option 1: Dùng SSH Key có sẵn (Khuyến nghị)

#### Trên máy local:

```bash
# Kiểm tra xem đã có SSH key chưa
ls -la ~/.ssh/

# Nếu thấy file id_rsa và id_rsa.pub là đã có
# Nếu chưa có, tạo mới:
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
# Nhấn Enter 3 lần (không đặt passphrase cho đơn giản)

# Xem public key
cat ~/.ssh/id_rsa.pub
# Copy toàn bộ nội dung (bắt đầu bằng ssh-rsa...)
```

#### Trên Server:

```bash
# Tạo thư mục .ssh nếu chưa có
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Thêm public key vào authorized_keys
nano ~/.ssh/authorized_keys
# Paste public key vào, save (Ctrl+O, Enter, Ctrl+X)

# Set quyền
chmod 600 ~/.ssh/authorized_keys

# Restart SSH service
sudo systemctl restart sshd
```

#### Test kết nối từ máy local:

```bash
# Thay YOUR_USER và YOUR_SERVER_IP
ssh YOUR_USER@YOUR_SERVER_IP

# Nếu vào được không cần password là thành công!
# Thoát ra: exit
```

### Option 2: Tạo SSH Key riêng cho CI/CD (Bảo mật hơn)

```bash
# Trên máy local, tạo key riêng
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_actions_key -C "github-actions"
# Không đặt passphrase

# Xem public key
cat ~/.ssh/github_actions_key.pub
# Copy và thêm vào server như Option 1

# Xem private key (dùng cho GitHub Secret)
cat ~/.ssh/github_actions_key
# Copy toàn bộ, bao gồm:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...
# -----END OPENSSH PRIVATE KEY-----
```

---

## Cấu hình GitHub Secrets

### Bước 1: Vào GitHub Repository

1. Mở trình duyệt, vào repo của bạn
2. Click **Settings** (tab cuối cùng)
3. Sidebar bên trái → **Secrets and variables** → **Actions**
4. Click nút **New repository secret**

### Bước 2: Thêm từng Secret

#### Secret 1: SERVER_HOST
```
Name: SERVER_HOST
Value: 123.45.67.89
```
- Điền IP public của server
- Hoặc domain nếu có (vd: vppmixu.com)
- **Không** có http://, https://, hoặc port

#### Secret 2: SERVER_USER
```
Name: SERVER_USER
Value: ubuntu
```
- Username SSH vào server
- Thường là: `ubuntu`, `root`, `admin`, hoặc user bạn tạo

#### Secret 3: SERVER_SSH_KEY
```
Name: SERVER_SSH_KEY
Value: (paste private key)
```
- Copy toàn bộ nội dung từ `cat ~/.ssh/id_rsa` (hoặc `github_actions_key`)
- Phải bao gồm dòng đầu và cuối:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
...nhiều dòng...
-----END OPENSSH PRIVATE KEY-----
```

#### Secret 4: SERVER_PORT (Optional)
```
Name: SERVER_PORT
Value: 22
```
- Chỉ cần thêm nếu SSH port khác 22
- Nếu dùng port 22 thì không cần thêm secret này

#### Secret 5: DEPLOY_PATH
```
Name: DEPLOY_PATH
Value: /var/www/vppmixu
```
- Đường dẫn tuyệt đối đến thư mục project trên server
- Ví dụ khác: `/home/ubuntu/web_vppmixu`, `/root/projects/vppmixu`

### Bước 3: Kiểm tra lại

Sau khi thêm xong, bạn sẽ thấy 5 secrets (hoặc 4 nếu không có SERVER_PORT):
- ✅ SERVER_HOST
- ✅ SERVER_USER  
- ✅ SERVER_SSH_KEY
- ✅ SERVER_PORT (optional)
- ✅ DEPLOY_PATH

---

## Deploy lần đầu

### Bước 1: Clone repo lên Server

```bash
# SSH vào server
ssh YOUR_USER@YOUR_SERVER_IP

# Di chuyển đến thư mục deploy (phải giống DEPLOY_PATH)
cd /var/www/vppmixu

# Clone repo (thay YOUR_USERNAME và YOUR_REPO)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
# Dấu chấm ở cuối để clone vào thư mục hiện tại

# Hoặc nếu thư mục chưa tạo:
cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git vppmixu
cd vppmixu
```

### Bước 2: Setup file .env.prod

```bash
# Di chuyển vào thư mục backend
cd backend

# Copy file example
cp .env.example .env.prod

# Chỉnh sửa file
nano .env.prod
```

Điền các thông tin sau (ví dụ):
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vppmixu_prod"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# App
NODE_ENV="production"
PORT=3000

# CORS
CORS_ORIGIN="https://yourdomain.com"

# Supabase (nếu dùng)
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_KEY="your-supabase-key"
```

Save file: `Ctrl+O`, `Enter`, `Ctrl+X`

### Bước 3: Test build thủ công lần đầu

```bash
# Quay về root project
cd /var/www/vppmixu

# Build và start containers
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Xem logs
docker-compose -f docker-compose.prod.yml logs -f

# Nếu mọi thứ OK, nhấn Ctrl+C để thoát logs
```

### Bước 4: Kiểm tra containers đang chạy

```bash
# Xem containers
docker ps

# Output mong đợi:
# CONTAINER ID   IMAGE                    STATUS         PORTS
# xxx            vppmixu-frontend         Up 2 minutes   0.0.0.0:8080->80/tcp
# xxx            vppmixu-backend          Up 2 minutes   3000/tcp
```

### Bước 5: Test API

```bash
# Test từ server
curl http://localhost:3000/health
# Hoặc
curl http://localhost:3000

# Test từ bên ngoài (thay YOUR_SERVER_IP)
curl http://YOUR_SERVER_IP:8080
```

Nếu thấy response là thành công! 🎉

---

## Test CI/CD

### Bước 1: Tạo commit test

Trên máy local:

```bash
# Tạo file test hoặc sửa file bất kỳ
echo "# Test CI/CD" >> README.md

# Commit
git add .
git commit -m "test: trigger CI/CD deploy"

# Push lên main
git push origin main
```

### Bước 2: Xem workflow chạy

1. Vào GitHub repo
2. Click tab **Actions** (ở trên cùng)
3. Sẽ thấy workflow "Deploy to Production" đang chạy (màu vàng 🟡)
4. Click vào để xem chi tiết

### Bước 3: Đọc logs

Trong workflow, click vào job "Deploy to Server" để xem:
- ✅ SSH connection thành công
- ✅ Git pull thành công
- ✅ Docker build thành công
- ✅ Containers restart thành công
- ✅ "Deploy thành công!" message

### Bước 4: Verify trên server

```bash
# SSH vào server
ssh YOUR_USER@YOUR_SERVER_IP

# Kiểm tra code đã update
cd /var/www/vppmixu
git log -1
# Sẽ thấy commit "test: trigger CI/CD deploy"

# Kiểm tra containers
docker ps

# Xem logs
docker-compose -f docker-compose.prod.yml logs --tail=50
```

---

## Troubleshooting

### ❌ Lỗi: "Permission denied (publickey)"

**Nguyên nhân**: SSH key không đúng hoặc chưa được thêm vào server

**Giải pháp**:
```bash
# 1. Kiểm tra lại private key trong GitHub Secret SERVER_SSH_KEY
# Phải bao gồm header và footer:
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----

# 2. Kiểm tra public key trên server
ssh YOUR_USER@YOUR_SERVER_IP
cat ~/.ssh/authorized_keys
# Phải có dòng bắt đầu bằng ssh-rsa...

# 3. Kiểm tra quyền
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# 4. Test SSH từ local
ssh -v YOUR_USER@YOUR_SERVER_IP
# Flag -v để xem chi tiết lỗi
```

### ❌ Lỗi: "Host key verification failed"

**Giải pháp**: Thêm vào file `.github/workflows/deploy.yml`:

```yaml
- name: Deploy via SSH
  uses: appleboy/ssh-action@v1.0.0
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SERVER_SSH_KEY }}
    port: ${{ secrets.SERVER_PORT || 22 }}
    script_stop: true  # Thêm dòng này
    script: |
      cd ${{ secrets.DEPLOY_PATH }}
      git pull origin main
      docker-compose -f docker-compose.prod.yml down
      docker-compose -f docker-compose.prod.yml build --no-cache
      docker-compose -f docker-compose.prod.yml up -d
      docker image prune -af
      echo "✅ Deploy thành công!"
```

### ❌ Lỗi: "fatal: could not read Username for 'https://github.com'"

**Nguyên nhân**: Server không có quyền pull từ GitHub (repo private)

**Giải pháp Option 1 - SSH URL** (Khuyến nghị):

```bash
# Trên server, tạo SSH key cho Git
ssh-keygen -t ed25519 -C "server@vppmixu.com" -f ~/.ssh/github_deploy
# Không đặt passphrase

# Xem public key
cat ~/.ssh/github_deploy.pub
# Copy nội dung

# Vào GitHub repo → Settings → Deploy keys → Add deploy key
# Paste public key vào, check "Allow write access" nếu cần

# Config Git dùng SSH key này
cd /var/www/vppmixu
git remote set-url origin git@github.com:YOUR_USERNAME/YOUR_REPO.git

# Test
git pull origin main
```

**Giải pháp Option 2 - Personal Access Token**:

```bash
# Tạo token: GitHub → Settings → Developer settings → Personal access tokens → Generate new token
# Chọn scope: repo (full control)

# Trên server
cd /var/www/vppmixu
git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git

# Test
git pull origin main
```

### ❌ Lỗi: "docker: command not found"

**Giải pháp**:
```bash
# Cài lại Docker theo hướng dẫn ở phần "Chuẩn bị Server"
# Hoặc kiểm tra PATH
echo $PATH

# Thêm Docker vào PATH
export PATH=$PATH:/usr/bin:/usr/local/bin
```

### ❌ Lỗi: "permission denied while trying to connect to the Docker daemon"

**Giải pháp**:
```bash
# Thêm user vào docker group
sudo usermod -aG docker $USER

# Logout và login lại
exit
ssh YOUR_USER@YOUR_SERVER_IP

# Hoặc dùng sudo trong workflow
# Sửa file deploy.yml:
script: |
  cd ${{ secrets.DEPLOY_PATH }}
  git pull origin main
  sudo docker-compose -f docker-compose.prod.yml down
  sudo docker-compose -f docker-compose.prod.yml build --no-cache
  sudo docker-compose -f docker-compose.prod.yml up -d
  sudo docker image prune -af
```

### ❌ Lỗi: Build quá lâu (timeout)

**Giải pháp 1**: Bỏ flag `--no-cache`

```yaml
script: |
  docker-compose -f docker-compose.prod.yml build  # Không có --no-cache
  docker-compose -f docker-compose.prod.yml up -d
```

**Giải pháp 2**: Tăng timeout

```yaml
- name: Deploy via SSH
  uses: appleboy/ssh-action@v1.0.0
  with:
    command_timeout: 30m  # Thêm dòng này (mặc định 10m)
```

### ❌ Lỗi: "Error response from daemon: Conflict"

**Nguyên nhân**: Containers đang chạy

**Giải pháp**:
```bash
# SSH vào server
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build
```

### ❌ Frontend không load được API

**Kiểm tra**:
```bash
# 1. Kiểm tra backend đang chạy
docker ps | grep backend

# 2. Kiểm tra logs backend
docker-compose -f docker-compose.prod.yml logs backend

# 3. Kiểm tra network
docker network ls
docker network inspect vppmixu_app-network

# 4. Test API từ frontend container
docker exec -it vppmixu-frontend-1 sh
wget -O- http://backend:3000/health
```

**Giải pháp**: Kiểm tra file `frontend/nginx.conf` có proxy đúng không:
```nginx
location /api {
    proxy_pass http://backend:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

---

## Nâng cao

### 1. Thêm Notification Telegram khi Deploy

Tạo bot Telegram và lấy token + chat_id, sau đó thêm vào workflow:

```yaml
jobs:
  deploy:
    name: Deploy to Server
    runs-on: ubuntu-latest
    
    steps:
      - name: Send Telegram notification - Start
        uses: appleboy/telegram-action@master
        with:
          to: ${{ secrets.TELEGRAM_CHAT_ID }}
          token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          message: |
            🚀 Bắt đầu deploy
            Commit: ${{ github.event.head_commit.message }}
            By: ${{ github.actor }}
      
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.0
        # ... (giữ nguyên)
      
      - name: Send Telegram notification - Success
        if: success()
        uses: appleboy/telegram-action@master
        with:
          to: ${{ secrets.TELEGRAM_CHAT_ID }}
          token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          message: |
            ✅ Deploy thành công!
            Commit: ${{ github.event.head_commit.message }}
      
      - name: Send Telegram notification - Failed
        if: failure()
        uses: appleboy/telegram-action@master
        with:
          to: ${{ secrets.TELEGRAM_CHAT_ID }}
          token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          message: |
            ❌ Deploy thất bại!
            Commit: ${{ github.event.head_commit.message }}
            Check: https://github.com/${{ github.repository }}/actions
```

### 2. Deploy chỉ khi có thay đổi Backend hoặc Frontend

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'
      - 'frontend/**'
      - 'docker-compose.prod.yml'
      - '.github/workflows/deploy.yml'
```

### 3. Chạy Database Migration tự động

```yaml
script: |
  cd ${{ secrets.DEPLOY_PATH }}
  git pull origin main
  
  # Run migrations trước khi build
  docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy
  
  docker-compose -f docker-compose.prod.yml down
  docker-compose -f docker-compose.prod.yml build --no-cache
  docker-compose -f docker-compose.prod.yml up -d
  docker image prune -af
```

### 4. Backup Database trước khi Deploy

```yaml
script: |
  cd ${{ secrets.DEPLOY_PATH }}
  
  # Backup database
  BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
  docker exec vppmixu-postgres-1 pg_dump -U postgres vppmixu > "/var/backups/$BACKUP_FILE"
  echo "✅ Backup created: $BACKUP_FILE"
  
  # Deploy
  git pull origin main
  docker-compose -f docker-compose.prod.yml down
  docker-compose -f docker-compose.prod.yml build --no-cache
  docker-compose -f docker-compose.prod.yml up -d
  docker image prune -af
```

### 5. Rollback nếu Deploy thất bại

```yaml
script: |
  cd ${{ secrets.DEPLOY_PATH }}
  
  # Lưu commit hiện tại
  CURRENT_COMMIT=$(git rev-parse HEAD)
  
  # Pull và deploy
  git pull origin main
  docker-compose -f docker-compose.prod.yml down
  docker-compose -f docker-compose.prod.yml build --no-cache
  docker-compose -f docker-compose.prod.yml up -d
  
  # Đợi 10s và check health
  sleep 10
  if ! curl -f http://localhost:3000/health; then
    echo "❌ Health check failed! Rolling back..."
    git reset --hard $CURRENT_COMMIT
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d
    exit 1
  fi
  
  echo "✅ Deploy thành công!"
```

### 6. Deploy theo môi trường (Staging/Production)

Tạo 2 workflows riêng:

**`.github/workflows/deploy-staging.yml`**:
```yaml
name: Deploy to Staging

on:
  push:
    branches:
      - develop

jobs:
  deploy:
    # ... dùng STAGING_SERVER_HOST, STAGING_DEPLOY_PATH
```

**`.github/workflows/deploy-production.yml`**:
```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    # ... dùng SERVER_HOST, DEPLOY_PATH
```

### 7. Manual Approval trước khi Deploy Production

```yaml
jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://vppmixu.com
    
    steps:
      # ... deploy steps
```

Sau đó vào GitHub repo → Settings → Environments → New environment → "production" → Add protection rules → Required reviewers

---

## 📚 Tài liệu tham khảo

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [SSH Action](https://github.com/appleboy/ssh-action)

---

## 🆘 Cần hỗ trợ?

Nếu gặp vấn đề:
1. Kiểm tra logs trong GitHub Actions
2. SSH vào server và xem logs: `docker-compose logs -f`
3. Kiểm tra lại từng bước trong hướng dẫn
4. Google error message cụ thể
5. Hỏi team hoặc tạo issue

---

**Chúc bạn deploy thành công! 🚀**
