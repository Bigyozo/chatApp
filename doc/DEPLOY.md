# 🚀 Chat App Docker 部署快速指南

## 📋 目录结构

```
chatApp/
├── Dockerfile                 # Docker 镜像定义
├── .dockerignore             # Docker 构建忽略文件
├── docker-compose.yml        # Docker Compose 配置
├── .env.example              # 环境变量模板
├── DEPLOY.md                 # 本文件
├── README-DOCKER.md          # 详细部署文档
└── scripts/
    ├── setup-ec2.sh          # EC2 初始化脚本
    └── deploy-ec2.sh         # 部署脚本
```

## 🎯 快速部署（3 步）

### 步骤 1: 准备 EC2 实例

SSH 连接到你的 EC2 实例并运行：

```bash
curl -o setup-ec2.sh https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/scripts/setup-ec2.sh
chmod +x setup-ec2.sh
./setup-ec2.sh
```

重新登录以使 Docker 权限生效：
```bash
exit
# 重新 SSH 连接
```

### 步骤 2: 部署应用

```bash
# 克隆仓库
git clone YOUR_REPO_URL
cd chatApp

# 配置环境变量
cp .env.example .env
nano .env  # 编辑并填入你的配置

# 部署
./scripts/deploy-ec2.sh
```

### 步骤 3: 配置安全组

在 AWS Console 中：
1. 进入 EC2 > 安全组
2. 为你的实例添加入站规则：
   - 类型：自定义 TCP
   - 端口：3000
   - 源：0.0.0.0/0 (或你的特定 IP)

## ✅ 验证部署

访问：`http://YOUR_EC2_IP:3000`

检查健康状态：
```bash
curl http://YOUR_EC2_IP:3000/api/health
```

## 🔧 常用命令

```bash
# 查看日志
docker-compose logs -f

# 重启应用
docker-compose restart

# 停止应用
docker-compose down

# 更新应用
git pull
./scripts/deploy-ec2.sh

# 查看运行状态
docker-compose ps
```

## 🏗️ 本地测试

在本地测试 Docker 镜像：

```bash
# 构建镜像
docker build -t chat-app:latest .

# 创建 .env 文件
cp .env.example .env
# 编辑 .env 填入配置

# 运行
docker-compose up -d

# 查看日志
docker-compose logs -f

# 访问
open http://localhost:3000
```

## 🔐 安全最佳实践

### 1. 使用 IAM 角色（强烈推荐）

不要在 `.env` 中硬编码 AWS 凭证：

```bash
# 在 AWS Console 中：
# 1. 创建 IAM 角色，附加 DynamoDB 访问策略
# 2. 将角色附加到 EC2 实例
# 3. 从 .env 中删除 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY
```

### 2. 配置 HTTPS

使用 Nginx 反向代理和 Let's Encrypt：

```bash
# 安装 Nginx 和 Certbot
sudo yum install -y nginx certbot python3-certbot-nginx

# 配置 Nginx
sudo nano /etc/nginx/conf.d/chat-app.conf
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3. 限制端口访问

更新安全组，只允许通过 Nginx (80/443) 访问，移除端口 3000 的直接访问。

## 🔍 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs

# 检查容器状态
docker-compose ps

# 进入容器调试
docker-compose exec chat-app sh
```

### 健康检查失败

```bash
# 检查端口
docker-compose ps
netstat -tlnp | grep 3000

# 测试健康端点
curl -v http://localhost:3000/api/health

# 查看应用日志
docker-compose logs chat-app
```

### 环境变量问题

```bash
# 检查容器中的环境变量
docker-compose exec chat-app env

# 确保 .env 文件格式正确（无空格）
cat .env
```

## 📊 监控和日志

### 查看实时日志

```bash
docker-compose logs -f --tail=100
```

### 持久化日志

修改 `docker-compose.yml` 添加日志配置：

```yaml
services:
  chat-app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### CloudWatch 集成（可选）

安装 CloudWatch 代理并配置日志收集。

## 🎓 进阶配置

### 多容器部署（负载均衡）

```bash
# 启动多个实例
docker-compose up -d --scale chat-app=3

# 使用 Nginx 负载均衡
# 配置 upstream 块
```

### 使用 Docker Hub

```bash
# 登录 Docker Hub
docker login

# 构建并推送
docker build -t your-username/chat-app:latest .
docker push your-username/chat-app:latest

# 在 EC2 上拉取
docker pull your-username/chat-app:latest
```

### CI/CD 集成

使用 GitHub Actions 自动部署：

```yaml
# .github/workflows/deploy.yml
name: Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to EC2
        # 配置 SSH 和部署脚本
```

## 📚 更多信息

详细文档请查看 [README-DOCKER.md](README-DOCKER.md)

## 🆘 获取帮助

- GitHub Issues: [项目 Issues 页面]
- 文档: [README-DOCKER.md](README-DOCKER.md)

---

💡 **提示**: 首次部署建议在测试环境验证后再部署到生产环境。
