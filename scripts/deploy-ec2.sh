#!/bin/bash

# Chat App EC2 デプロイスクリプト
# 使用方法: ./scripts/deploy-ec2.sh

set -e

echo "🚀 Chat App を EC2 へデプロイ開始..."

# 色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# .env ファイルの確認
if [ ! -f .env ]; then
    echo -e "${RED}❌ エラー: .env ファイルが見つかりません${NC}"
    echo ".env ファイルを作成して必要な環境変数を設定してください"
    echo "参考: cp .env.example .env"
    exit 1
fi

echo -e "${GREEN}✓ .env ファイルを確認しました${NC}"

# 環境変数の検証
echo -e "${YELLOW}🔍 環境変数を検証中...${NC}"
source .env

# AWS Region の確認
if [ -z "$AWS_REGION" ]; then
    echo -e "${YELLOW}⚠ 警告: AWS_REGION が未設定です。デフォルト値 us-east-1 を使用します${NC}"
fi

# AWS 認証情報の確認（IAM ロールを使用しない場合）
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ "$AWS_ACCESS_KEY_ID" == "your_aws_access_key_id" ]; then
    echo -e "${YELLOW}⚠ 警告: AWS_ACCESS_KEY_ID が正しく設定されていません${NC}"
    echo -e "${YELLOW}  EC2 上で IAM ロールを使用する場合はこの警告を無視してください${NC}"
    echo -e "${YELLOW}  それ以外の場合は .env に正しい AWS 認証情報を設定してください${NC}"
fi

if [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ "$AWS_SECRET_ACCESS_KEY" == "your_aws_secret_access_key" ]; then
    echo -e "${YELLOW}⚠ 警告: AWS_SECRET_ACCESS_KEY が正しく設定されていません${NC}"
fi

# NEXT_PUBLIC_* の確認（ビルド時にクライアントバンドルへ埋め込まれるため必須）
if [ -z "$NEXT_PUBLIC_REDIRECT_URL" ]; then
    echo -e "${RED}❌ エラー: NEXT_PUBLIC_REDIRECT_URL が未設定です${NC}"
    echo ".env に以下を追加してください: NEXT_PUBLIC_REDIRECT_URL=https://your-domain.com"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_COGNITO_AUTHORITY" ]; then
    echo -e "${RED}❌ エラー: NEXT_PUBLIC_COGNITO_AUTHORITY が未設定です${NC}"
    echo ".env に以下を追加してください: NEXT_PUBLIC_COGNITO_AUTHORITY=https://cognito-idp.<region>.amazonaws.com/<userPoolId>"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_COGNITO_CLIENT_ID" ]; then
    echo -e "${RED}❌ エラー: NEXT_PUBLIC_COGNITO_CLIENT_ID が未設定です${NC}"
    echo ".env に以下を追加してください: NEXT_PUBLIC_COGNITO_CLIENT_ID=<your-client-id>"
    exit 1
fi

PORT="${PORT:-3001}"

echo -e "${GREEN}✓ NEXT_PUBLIC_REDIRECT_URL=${NEXT_PUBLIC_REDIRECT_URL}${NC}"
echo -e "${GREEN}✓ NEXT_PUBLIC_COGNITO_AUTHORITY=${NEXT_PUBLIC_COGNITO_AUTHORITY}${NC}"
echo -e "${GREEN}✓ NEXT_PUBLIC_COGNITO_CLIENT_ID=${NEXT_PUBLIC_COGNITO_CLIENT_ID}${NC}"
echo -e "${GREEN}✓ PORT=${PORT}${NC}"
echo -e "${GREEN}✓ 環境変数の検証完了${NC}"

# Docker がインストールされているか確認
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ エラー: Docker がインストールされていません${NC}"
    echo "先に Docker をインストールしてください"
    exit 1
fi

echo -e "${GREEN}✓ Docker がインストールされています${NC}"

# 既存コンテナを停止・削除
echo -e "${YELLOW}🛑 旧コンテナを停止中...${NC}"
docker-compose down 2>/dev/null || true

# 新しいイメージをビルド
echo -e "${YELLOW}🔨 Docker イメージをビルド中...${NC}"
docker build \
    --build-arg NEXT_PUBLIC_REDIRECT_URL="$NEXT_PUBLIC_REDIRECT_URL" \
    --build-arg NEXT_PUBLIC_COGNITO_AUTHORITY="$NEXT_PUBLIC_COGNITO_AUTHORITY" \
    --build-arg NEXT_PUBLIC_COGNITO_CLIENT_ID="$NEXT_PUBLIC_COGNITO_CLIENT_ID" \
    --build-arg PORT="$PORT" \
    -t chat-app:latest .

# 新しいコンテナを起動
echo -e "${YELLOW}🚀 コンテナを起動中...${NC}"
docker-compose up -d --no-build

# サービスの起動を待機
echo -e "${YELLOW}⏳ サービスの起動を待機中...${NC}"
sleep 10

# ヘルスチェック
echo -e "${YELLOW}🏥 サービスのヘルス状態を確認中...${NC}"
for i in {1..10}; do
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ サービスが正常に起動しました！${NC}"
        echo -e "${GREEN}🎉 デプロイ完了！${NC}"
        echo -e "アクセス URL: http://localhost"
        docker-compose ps
        exit 0
    fi
    echo "確認中 $i/10..."
    sleep 3
done

echo -e "${RED}❌ サービスのヘルスチェックに失敗しました${NC}"
echo "ログを確認してください:"
docker-compose logs --tail=50
exit 1
