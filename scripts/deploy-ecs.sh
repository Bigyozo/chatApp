#!/bin/bash

# ECR デプロイスクリプト
# 使用方法: ./scripts/deploy-ecr.sh

set -e

ACCOUNT_ID="${AWS_ACCOUNT_ID:?ERROR: AWS_ACCOUNT_ID is not set. Export it before running this script.}"
REGION="${AWS_REGION:-ap-northeast-1}"
ECR_REPO="${ECR_REPO_NAME:-chat-app}"
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO"
YOUR_DOMAIN="${NEXT_PUBLIC_REDIRECT_URL:?ERROR: NEXT_PUBLIC_REDIRECT_URL is not set.}"
CLUSTER="${ECS_CLUSTER_NAME:-chat-app-cluster}"
SERVICE="${ECS_SERVICE_NAME:-chat-app-service}"
TASK_DEF="${ECS_TASK_DEFINITION:-chatTask}"

# 色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🚀 ECR デプロイ開始${NC}"
echo ""

# Step 1: ECR にログイン
echo -e "${YELLOW}Step 1/5: ECR にログイン中...${NC}"
PASSWORD=$(aws ecr get-login-password --region $REGION)
echo "$PASSWORD" | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
echo -e "${GREEN}✅ ログイン成功${NC}"
echo ""

# Step 2: イメージをビルド
echo -e "${YELLOW}Step 2/5: Docker イメージをビルド中...${NC}"
echo "   ビルドコマンド: docker build --build-arg NEXT_PUBLIC_REDIRECT_URL=$YOUR_DOMAIN -t chat-app:latest ."
docker build \
  --build-arg NEXT_PUBLIC_REDIRECT_URL="$YOUR_DOMAIN" \
  -t chat-app:latest \
  .

echo -e "${GREEN}✅ イメージビルド完了${NC}"
echo ""

# Step 3: イメージにタグを付ける
echo -e "${YELLOW}Step 3/5: イメージにタグを付けています...${NC}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
docker tag chat-app:latest $ECR_URI:latest
docker tag chat-app:latest $ECR_URI:$TIMESTAMP
echo -e "${GREEN}✅ タグ付け完了${NC}"
echo ""

# Step 4: ECR にプッシュ
echo -e "${YELLOW}Step 4/5: イメージを ECR にプッシュ中...${NC}"
docker push $ECR_URI:latest
docker push $ECR_URI:$TIMESTAMP
echo -e "${GREEN}✅ プッシュ完了${NC}"
echo ""

# Step 5: Task Definition を更新
echo -e "${YELLOW}Step 5/6: Task Definition を更新中...${NC}"

# 現在の Task Definition を取得
CURRENT_TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition $TASK_DEF \
  --region $REGION \
  --query 'taskDefinition' --output json)

# イメージ URI を変更
NEW_TASK_DEF=$(echo $CURRENT_TASK_DEF | \
  jq --arg IMAGE "$ECR_URI:latest" '.containerDefinitions[0].image = $IMAGE' | \
  jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

# 新しい Task Definition を登録
aws ecs register-task-definition \
  --cli-input-json "$(echo $NEW_TASK_DEF)" \
  --region $REGION > /dev/null

echo -e "${GREEN}✅ Task Definition 更新完了${NC}"
echo ""

# Step 6: 強制再デプロイ
echo -e "${YELLOW}Step 6/6: Service を強制再デプロイ中...${NC}"
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --force-new-deployment \
  --region $REGION > /dev/null

echo -e "${GREEN}✅ Service デプロイコマンド送信完了${NC}"
echo ""

echo -e "${GREEN}🎉 デプロイ完了！${NC}"
echo ""
echo "📊 デプロイ詳細:"
echo "   ECR Repository: $ECR_URI"
echo "   Cluster: $CLUSTER"
echo "   Service: $SERVICE"
echo ""
echo "⏳ 新しいタスクが起動するまで 1〜2 分ほどお待ちください..."
sleep 5
echo ""

# デプロイ状態を確認
echo -e "${YELLOW}Service のデプロイ状態を確認中...${NC}"
aws ecs describe-services \
  --cluster $CLUSTER \
  --services $SERVICE \
  --region $REGION \
  --query 'services[0].[serviceName,status,runningCount,desiredCount,deployments[*].status]' \
  --output table

echo ""
echo -e "${GREEN}✅ すべてのステップが完了しました！${NC}"
echo "   アプリケーション URL: $YOUR_DOMAIN"
