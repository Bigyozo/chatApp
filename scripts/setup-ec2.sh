#!/bin/bash

# EC2 实例初始化脚本
# 在 EC2 实例上运行此脚本以安装必要的依赖

set -e

echo "🔧 开始配置 EC2 实例..."

# 更新系统
echo "📦 更新系统包..."
sudo yum update -y

# 安装 Docker
echo "🐳 安装 Docker..."
if ! command -v docker &> /dev/null; then
    sudo yum install -y docker
    sudo service docker start
    sudo systemctl enable docker
    sudo usermod -a -G docker ec2-user
    echo "✓ Docker 安装完成"
else
    echo "✓ Docker 已安装"
fi

# 安装 Docker Compose
echo "🔧 安装 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✓ Docker Compose 安装完成"
else
    echo "✓ Docker Compose 已安装"
fi

# 安装 Git
echo "📚 安装 Git..."
if ! command -v git &> /dev/null; then
    sudo yum install -y git
    echo "✓ Git 安装完成"
else
    echo "✓ Git 已安装"
fi

# 创建应用目录
echo "📁 创建应用目录..."
mkdir -p ~/chatApp
cd ~/chatApp

echo ""
echo "✅ EC2 实例配置完成!"
echo ""
echo "📝 下一步:"
echo "1. 克隆你的代码仓库: git clone <your-repo-url>"
echo "2. 进入项目目录: cd chatApp"
echo "3. 创建 .env 文件并配置环境变量"
echo "4. 运行部署脚本: ./scripts/deploy-ec2.sh"
echo ""
echo "⚠️  注意: 你可能需要重新登录以使 Docker 组权限生效"
echo "   运行: exit 然后重新 SSH 登录"
