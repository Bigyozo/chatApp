#!/bin/bash

# EC2 インスタンス初期化スクリプト
# EC2 インスタンス上で実行し、必要な依存関係をインストールする

set -e

echo "🔧 EC2 インスタンスの設定を開始します..."

# システムを更新
echo "📦 システムパッケージを更新中..."
sudo yum update -y

# Docker のインストール
echo "🐳 Docker をインストール中..."
if ! command -v docker &> /dev/null; then
    sudo yum install -y docker
    sudo service docker start
    sudo systemctl enable docker
    sudo usermod -a -G docker ec2-user
    echo "✓ Docker のインストール完了"
else
    echo "✓ Docker はすでにインストール済みです"
fi

# Docker Compose のインストール
echo "🔧 Docker Compose をインストール中..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✓ Docker Compose のインストール完了"
else
    echo "✓ Docker Compose はすでにインストール済みです"
fi

# Git のインストール
echo "📚 Git をインストール中..."
if ! command -v git &> /dev/null; then
    sudo yum install -y git
    echo "✓ Git のインストール完了"
else
    echo "✓ Git はすでにインストール済みです"
fi

# Certbot（Let's Encrypt 証明書ツール）のインストール
echo "🔒 Certbot をインストール中..."
if ! command -v certbot &> /dev/null; then
    sudo yum install -y certbot
    echo "✓ Certbot のインストール完了"
else
    echo "✓ Certbot はすでにインストール済みです"
fi

# ACME チャレンジ用ディレクトリを作成（証明書更新時に使用）
sudo mkdir -p /var/www/certbot

# アプリケーションディレクトリを作成
echo "📁 アプリケーションディレクトリを作成中..."
mkdir -p ~/chatApp
cd ~/chatApp

echo ""
echo "✅ EC2 インスタンスの設定完了！"
echo ""
echo "📝 次のステップ:"
echo "1. リポジトリをクローンする: git clone <your-repo-url>"
echo "2. プロジェクトディレクトリへ移動: cd chatApp"
echo "3. .env ファイルを作成して環境変数を設定する"
echo "4. EC2 セキュリティグループでポート 80 と 443 を開放する"
echo "5. SSL 証明書を初回取得する（ポート 80 が空いている必要があります）:"
echo "   sudo certbot certonly --standalone -d your-domain.com"
echo "6. デプロイスクリプトを実行する: ./scripts/deploy-ec2.sh"
echo ""
echo "🔄 証明書の自動更新設定 (sudo crontab -e で以下を追加):"
echo "   0 0 * * 1 certbot renew --webroot -w /var/www/certbot --quiet && docker compose -f ~/chatApp/docker-compose.yml exec nginx nginx -s reload"
echo ""
echo "⚠️  注意: Docker グループの権限を反映するため、一度ログアウトして再度 SSH 接続してください"
echo "   実行: exit → 再度 SSH ログイン"
