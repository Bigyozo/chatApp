#!/bin/bash

# ECR 部署脚本
# 使用方法: ./scripts/deploy-ecr.sh

set -e

ACCOUNT_ID="920975870093"
REGION="ap-northeast-1"
ECR_REPO="chat-app"
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO"
YOUR_DOMAIN="https://zhangfanglong.click"
CLUSTER="chat-app-cluster"
SERVICE="chat-app-service"
TASK_DEF="chatTask"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🚀 ECR 部署流程开始${NC}"
echo ""

# Step 1: 登录 ECR
echo -e "${YELLOW}Step 1/5: 登录 ECR...${NC}"
PASSWORD=$(aws ecr get-login-password --region $REGION)
echo "$PASSWORD" | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
echo -e "${GREEN}✅ 登录成功${NC}"
echo ""

# Step 2: 构建镜像
echo -e "${YELLOW}Step 2/5: 构建 Docker 镜像...${NC}"
echo "   构建命令: docker build --build-arg NEXT_PUBLIC_REDIRECT_URL=$YOUR_DOMAIN -t chat-app:latest ."
docker build \
  --build-arg NEXT_PUBLIC_REDIRECT_URL="$YOUR_DOMAIN" \
  -t chat-app:latest \
  .

echo -e "${GREEN}✅ 镜像构建完成${NC}"
echo ""

# Step 3: 标记镜像
echo -e "${YELLOW}Step 3/5: 标记镜像...${NC}"
docker tag chat-app:latest $ECR_URI:latest
docker tag chat-app:latest $ECR_URI:$(date +%Y%m%d-%H%M%S)
echo -e "${GREEN}✅ 标记完成${NC}"
echo ""

# Step 4: Push 到 ECR
echo -e "${YELLOW}Step 4/5: Push 镜像到 ECR...${NC}"
docker push $ECR_URI:latest
docker push $ECR_URI:$(date +%Y%m%d-%H%M%S)
echo -e "${GREEN}✅ Push 完成${NC}"
echo ""

# Step 5: 更新 Task Definition
echo -e "${YELLOW}Step 5/5: 更新 Task Definition...${NC}"

# 获取当前 Task Definition
CURRENT_TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition $TASK_DEF \
  --region $REGION \
  --query 'taskDefinition' --output json)

# 修改镜像 URI
NEW_TASK_DEF=$(echo $CURRENT_TASK_DEF | \
  jq --arg IMAGE "$ECR_URI:latest" '.containerDefinitions[0].image = $IMAGE' | \
  jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

# 注册新的 Task Definition
aws ecs register-task-definition \
  --cli-input-json "$(echo $NEW_TASK_DEF)" \
  --region $REGION > /dev/null

echo -e "${GREEN}✅ Task Definition 已更新${NC}"
echo ""

# Step 6: 强制重新部署
echo -e "${YELLOW}Step 6/5: 强制重新部署 Service...${NC}"
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --force-new-deployment \
  --region $REGION > /dev/null

echo -e "${GREEN}✅ Service 部署命令已发送${NC}"
echo ""

echo -e "${GREEN}🎉 部署流程完成！${NC}"
echo ""
echo "📊 部署详情："
echo "   ECR Repository: $ECR_URI"
echo "   Cluster: $CLUSTER"
echo "   Service: $SERVICE"
echo ""
echo "⏳ 等待 1-2 分钟让新的 Task 启动..."
sleep 5
echo ""

# 检查部署状态
echo -e "${YELLOW}检查 Service 部署状态...${NC}"
aws ecs describe-services \
  --cluster $CLUSTER \
  --services $SERVICE \
  --region $REGION \
  --query 'services[0].[serviceName,status,runningCount,desiredCount,deployments[*].status]' \
  --output table

echo ""
echo -e "${GREEN}✅ 所有步骤完成！${NC}"
echo "   应用地址: https://zhangfanglong.click"
