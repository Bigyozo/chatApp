#!/bin/bash

# 环境变量检查脚本
# 使用方法: ./scripts/check-env.sh

echo "🔍 检查 Docker 容器环境变量..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查容器是否运行
if ! docker ps | grep -q chat-app; then
    echo -e "${RED}❌ chat-app 容器未运行${NC}"
    echo "请先启动容器: docker-compose up -d"
    exit 1
fi

echo -e "${GREEN}✓ 容器正在运行${NC}"
echo ""

# 检查环境变量
echo "📋 环境变量状态:"
echo "================================"

# 检查 AWS Region
AWS_REGION=$(docker-compose exec -T chat-app sh -c 'echo $AWS_REGION')
if [ -n "$AWS_REGION" ]; then
    echo -e "${GREEN}✓${NC} AWS_REGION: $AWS_REGION"
else
    echo -e "${RED}✗${NC} AWS_REGION: 未设置"
fi

# 检查 AWS Access Key ID (只显示前几个字符)
AWS_KEY=$(docker-compose exec -T chat-app sh -c 'echo $AWS_ACCESS_KEY_ID')
if [ -n "$AWS_KEY" ] && [ "$AWS_KEY" != "your_aws_access_key_id" ]; then
    KEY_PREFIX=$(echo $AWS_KEY | cut -c1-8)
    echo -e "${GREEN}✓${NC} AWS_ACCESS_KEY_ID: ${KEY_PREFIX}... (已设置)"
else
    echo -e "${YELLOW}⚠${NC} AWS_ACCESS_KEY_ID: 未设置或使用默认值"
fi

# 检查 AWS Secret Access Key
AWS_SECRET=$(docker-compose exec -T chat-app sh -c 'echo $AWS_SECRET_ACCESS_KEY')
if [ -n "$AWS_SECRET" ] && [ "$AWS_SECRET" != "your_aws_secret_access_key" ]; then
    echo -e "${GREEN}✓${NC} AWS_SECRET_ACCESS_KEY: ******* (已设置)"
else
    echo -e "${YELLOW}⚠${NC} AWS_SECRET_ACCESS_KEY: 未设置或使用默认值"
fi

# 检查 OpenAI API Key
OPENAI_KEY=$(docker-compose exec -T chat-app sh -c 'echo $OPENAI_API_KEY')
if [ -n "$OPENAI_KEY" ] && [ "$OPENAI_KEY" != "your_openai_api_key" ]; then
    KEY_PREFIX=$(echo $OPENAI_KEY | cut -c1-8)
    echo -e "${GREEN}✓${NC} OPENAI_API_KEY: ${KEY_PREFIX}... (已设置)"
else
    echo -e "${YELLOW}⚠${NC} OPENAI_API_KEY: 未设置或使用默认值"
fi

# 检查 Node Environment
NODE_ENV=$(docker-compose exec -T chat-app sh -c 'echo $NODE_ENV')
if [ -n "$NODE_ENV" ]; then
    echo -e "${GREEN}✓${NC} NODE_ENV: $NODE_ENV"
else
    echo -e "${YELLOW}⚠${NC} NODE_ENV: 未设置"
fi

echo "================================"
echo ""

# 测试 AWS 连接
echo "🔗 测试 AWS 连接..."
echo "访问健康检查端点..."

if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} 应用运行正常"
else
    echo -e "${RED}✗${NC} 应用健康检查失败"
fi

echo ""
echo "📊 查看最近的日志:"
echo "================================"
docker-compose logs --tail=20 chat-app

echo ""
echo "💡 提示:"
echo "  - 如果 AWS 凭证未设置，请检查 .env 文件"
echo "  - 如果使用 IAM 角色，确保 EC2 实例已附加正确的角色"
echo "  - 使用命令查看完整日志: docker-compose logs -f chat-app"
