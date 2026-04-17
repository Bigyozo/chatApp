#!/bin/bash

# 環境変数チェックスクリプト
# 使用方法: ./scripts/check-env.sh

echo "🔍 Docker コンテナの環境変数を確認中..."
echo ""

# 色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# コンテナが起動しているか確認
if ! docker ps | grep -q chat-app; then
    echo -e "${RED}❌ chat-app コンテナが起動していません${NC}"
    echo "先にコンテナを起動してください: docker-compose up -d"
    exit 1
fi

echo -e "${GREEN}✓ コンテナが起動中です${NC}"
echo ""

# 環境変数の確認
echo "📋 環境変数の状態:"
echo "================================"

# AWS Region の確認
AWS_REGION=$(docker-compose exec -T chat-app sh -c 'echo $AWS_REGION')
if [ -n "$AWS_REGION" ]; then
    echo -e "${GREEN}✓${NC} AWS_REGION: $AWS_REGION"
else
    echo -e "${RED}✗${NC} AWS_REGION: 未設定"
fi

# AWS Access Key ID の確認（先頭数文字のみ表示）
AWS_KEY=$(docker-compose exec -T chat-app sh -c 'echo $AWS_ACCESS_KEY_ID')
if [ -n "$AWS_KEY" ] && [ "$AWS_KEY" != "your_aws_access_key_id" ]; then
    KEY_PREFIX=$(echo $AWS_KEY | cut -c1-8)
    echo -e "${GREEN}✓${NC} AWS_ACCESS_KEY_ID: ${KEY_PREFIX}... (設定済み)"
else
    echo -e "${YELLOW}⚠${NC} AWS_ACCESS_KEY_ID: 未設定またはデフォルト値のまま"
fi

# AWS Secret Access Key の確認
AWS_SECRET=$(docker-compose exec -T chat-app sh -c 'echo $AWS_SECRET_ACCESS_KEY')
if [ -n "$AWS_SECRET" ] && [ "$AWS_SECRET" != "your_aws_secret_access_key" ]; then
    echo -e "${GREEN}✓${NC} AWS_SECRET_ACCESS_KEY: ******* (設定済み)"
else
    echo -e "${YELLOW}⚠${NC} AWS_SECRET_ACCESS_KEY: 未設定またはデフォルト値のまま"
fi

# Node Environment の確認
NODE_ENV=$(docker-compose exec -T chat-app sh -c 'echo $NODE_ENV')
if [ -n "$NODE_ENV" ]; then
    echo -e "${GREEN}✓${NC} NODE_ENV: $NODE_ENV"
else
    echo -e "${YELLOW}⚠${NC} NODE_ENV: 未設定"
fi

echo "================================"
echo ""

# AWS 接続テスト
echo "🔗 AWS 接続テスト中..."
echo "ヘルスチェックエンドポイントへアクセス..."

if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} アプリケーションが正常に動作しています"
else
    echo -e "${RED}✗${NC} アプリケーションのヘルスチェックに失敗しました"
fi

echo ""
echo "📊 最新のログ:"
echo "================================"
docker-compose logs --tail=20 chat-app

echo ""
echo "💡 ヒント:"
echo "  - AWS 認証情報が未設定の場合は .env ファイルを確認してください"
echo "  - IAM ロールを使用する場合は EC2 インスタンスに正しいロールがアタッチされているか確認してください"
echo "  - 全ログを表示するには: docker-compose logs -f chat-app"
