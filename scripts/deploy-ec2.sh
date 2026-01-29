#!/bin/bash

# Chat App EC2 部署脚本
# 使用方法: ./scripts/deploy-ec2.sh

set -e

echo "🚀 开始部署 Chat App 到 EC2..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${RED}❌ 错误: 未找到 .env 文件${NC}"
    echo "请创建 .env 文件并配置必要的环境变量"
    echo "参考: cp .env.example .env"
    exit 1
fi

echo -e "${GREEN}✓ 找到 .env 文件${NC}"

# 验证关键环境变量
echo -e "${YELLOW}🔍 验证环境变量...${NC}"
source .env

# 检查 AWS Region
if [ -z "$AWS_REGION" ]; then
    echo -e "${YELLOW}⚠ 警告: AWS_REGION 未设置，将使用默认值 us-east-1${NC}"
fi

# 检查 AWS 凭证（如果不使用 IAM 角色）
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ "$AWS_ACCESS_KEY_ID" == "your_aws_access_key_id" ]; then
    echo -e "${YELLOW}⚠ 警告: AWS_ACCESS_KEY_ID 未正确设置${NC}"
    echo -e "${YELLOW}  如果在 EC2 上使用 IAM 角色，可以忽略此警告${NC}"
    echo -e "${YELLOW}  否则请在 .env 中设置正确的 AWS 凭证${NC}"
fi

if [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ "$AWS_SECRET_ACCESS_KEY" == "your_aws_secret_access_key" ]; then
    echo -e "${YELLOW}⚠ 警告: AWS_SECRET_ACCESS_KEY 未正确设置${NC}"
fi

# 检查 API Keys
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" == "your_openai_api_key" ]; then
    echo -e "${RED}❌ 错误: OPENAI_API_KEY 未正确设置${NC}"
    echo "请在 .env 文件中设置有效的 OpenAI API Key"
    exit 1
fi

echo -e "${GREEN}✓ 环境变量验证完成${NC}"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 错误: Docker 未安装${NC}"
    echo "请先安装 Docker"
    exit 1
fi

echo -e "${GREEN}✓ Docker 已安装${NC}"

# 停止并删除旧容器
echo -e "${YELLOW}🛑 停止旧容器...${NC}"
docker-compose down 2>/dev/null || true

# 构建新镜像
echo -e "${YELLOW}🔨 构建 Docker 镜像...${NC}"
docker build -t chat-app:latest .

# 启动新容器
echo -e "${YELLOW}🚀 启动容器...${NC}"
docker-compose up -d

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 10

# 检查健康状态
echo -e "${YELLOW}🏥 检查服务健康状态...${NC}"
for i in {1..10}; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 服务运行正常!${NC}"
        echo -e "${GREEN}🎉 部署完成!${NC}"
        echo -e "访问地址: http://localhost:3000"
        docker-compose ps
        exit 0
    fi
    echo "尝试 $i/10..."
    sleep 3
done

echo -e "${RED}❌ 服务健康检查失败${NC}"
echo "查看日志:"
docker-compose logs --tail=50
exit 1
