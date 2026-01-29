# Docker 部署指南

本指南介绍如何使用 Docker 在 AWS EC2 上部署 Chat App。

## 前置要求

- 已配置的 AWS EC2 实例
- 已安装 Docker 和 Docker Compose
- 配置好的 AWS DynamoDB 表
- OpenAI 和 DeepSeek API 密钥

## 本地构建和测试

### 1. 构建 Docker 镜像

```bash
docker build -t chat-app:latest .
```

### 2. 运行容器 (手动方式)

```bash
docker run -d \
  -p 3000:3000 \
  -e AWS_REGION=us-east-1 \
  -e AWS_ACCESS_KEY_ID=your_access_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret_key \
  -e OPENAI_API_KEY=your_openai_key \
  -e DEEPSEEK_API_KEY=your_deepseek_key \
  -e DYNAMODB_TABLE_NAME=your_table_name \
  --name chat-app \
  chat-app:latest
```

### 3. 使用 Docker Compose

创建 `.env` 文件：

```bash
# .env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
OPENAI_API_KEY=your_openai_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here
DYNAMODB_TABLE_NAME=your_table_name
```

启动应用：

```bash
docker-compose up -d
```

查看日志：

```bash
docker-compose logs -f
```

停止应用：

```bash
docker-compose down
```

## AWS EC2 部署

### 1. 准备 EC2 实例

```bash
# 连接到 EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# 安装 Docker
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 部署应用

方法一：从源码构建

```bash
# 克隆仓库
git clone <your-repo-url>
cd chatApp

# 创建环境变量文件
cat > .env << EOF
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
OPENAI_API_KEY=your_openai_key
DEEPSEEK_API_KEY=your_deepseek_key
DYNAMODB_TABLE_NAME=your_table
EOF

# 构建并运行
docker-compose up -d
```

方法二：使用 Docker Hub（推荐）

```bash
# 在本地构建并推送到 Docker Hub
docker build -t your-dockerhub-username/chat-app:latest .
docker push your-dockerhub-username/chat-app:latest

# 在 EC2 上拉取并运行
docker pull your-dockerhub-username/chat-app:latest
docker run -d -p 3000:3000 --env-file .env your-dockerhub-username/chat-app:latest
```

### 3. 配置安全组

在 AWS Console 中为 EC2 实例配置安全组：
- 允许入站流量：端口 3000 (HTTP)
- 可选：配置负载均衡器和 HTTPS

### 4. 使用 IAM 角色（推荐）

为了安全，建议使用 IAM 角色而不是硬编码 AWS 凭证：

1. 在 AWS Console 创建 IAM 角色
2. 附加 DynamoDB 访问策略
3. 将角色附加到 EC2 实例
4. 从环境变量中移除 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY

### 5. 设置反向代理 (可选)

使用 Nginx 作为反向代理：

```bash
# 安装 Nginx
sudo yum install -y nginx

# 配置 Nginx
sudo tee /etc/nginx/conf.d/chat-app.conf > /dev/null << EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 启动 Nginx
sudo service nginx start
```

## 维护命令

```bash
# 查看运行中的容器
docker ps

# 查看日志
docker logs -f chat-app

# 重启容器
docker restart chat-app

# 更新应用
docker-compose pull
docker-compose up -d

# 清理旧镜像
docker system prune -a
```

## 监控和健康检查

应用包含健康检查端点，可以使用以下方式监控：

```bash
# 检查健康状态
curl http://localhost:3000/api/health

# 使用 Docker 健康检查
docker inspect --format='{{.State.Health.Status}}' chat-app
```

## 故障排查

```bash
# 查看容器详细信息
docker inspect chat-app

# 进入容器内部
docker exec -it chat-app sh

# 查看环境变量
docker exec chat-app env

# 查看实时日志
docker logs -f --tail 100 chat-app
```

## 性能优化建议

1. 使用 AWS Application Load Balancer 进行负载均衡
2. 配置 CloudWatch 监控
3. 使用 Auto Scaling 组
4. 启用 DynamoDB 自动扩展
5. 考虑使用 AWS ECS 或 EKS 进行容器编排
