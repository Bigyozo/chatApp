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

# 環境変数の検証
echo -e "${YELLOW}🔍 環境変数を検証中...${NC}"

# AWS_REGION: 未設定の場合は EC2 IMDS から自動取得
if [ -z "$AWS_REGION" ]; then
    echo -e "${YELLOW}⚠ AWS_REGION が未設定です。EC2 IMDS からリージョンを自動取得します${NC}"
fi

PORT="${PORT:-3001}"

# Cognito 設定は SSM Parameter Store から取得されるため、ここでの検証は不要
echo -e "${GREEN}✓ PORT=${PORT}${NC}"
echo -e "${GREEN}✓ 環境変数の検証完了${NC}"
echo -e "${YELLOW}  Cognito 設定は SSM Parameter Store (/chatapp/*) からランタイムに取得されます${NC}"

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
