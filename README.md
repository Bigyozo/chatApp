# Chat App

AWS Bedrock を活用した AI チャットアプリケーションです。Next.js 15 をベースに、複数の AI モデル（Gemma、DeepSeek、GPT-OSS）とのリアルタイムストリーミング会話をサポートします。認証は AWS Cognito、データ永続化は DynamoDB を使用しています。

## 主な機能

- 複数 AI モデルの切り替え対応
- Server-Sent Events によるリアルタイムストリーミング応答
- AWS Cognito による OIDC 認証（ログイン・ログアウト）
- チャット履歴の永続化（DynamoDB）

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 19, Next.js 15, Tailwind CSS 4, Material-UI |
| 認証 | AWS Cognito (OIDC) |
| AI 推論 | AWS Bedrock (ストリーミング) |
| データベース | Amazon DynamoDB |
| デプロイ | Docker, Nginx, Certbot (Let's Encrypt) |

## AWS デプロイアーキテクチャ

EC2 インスタンス上に Docker Compose で各サービスをデプロイし、Nginx によるリバースプロキシと Certbot による SSL 証明書の自動管理を行います。

```
┌───────────────────────────────────────────────────────────────────┐
│                          AWS Cloud                                │
│                                                                   │
│   ┌───────────────────────────────────────────────────────────┐   │
│   │                    EC2 Instance                           │   │
│   │                   (Docker Compose)                        │   │
│   │                                                           │   │
│   │   ┌───────────────────────────────────────────────────┐   │   │
│   │   │              Nginx (nginx:alpine)                 │   │   │
│   │   │                                                   │   │   │
│   │   │  :443 -- SSL termination                          │   │   │
│   │   │  :80  -- HTTPS redirect + ACME challenge          │   │   │
│   │   └────────────────────┬──────────────────────────────┘   │   │
│   │                        │ proxy_pass                       │   │
│   │                        v                                  │   │
│   │   ┌───────────────────────────────────────────────────┐   │   │
│   │   │          chat-app (Node.js 20 Alpine)             │   │   │
│   │   │                                                   │   │   │
│   │   │  Next.js 15 (:3000)                               │   │   │
│   │   │  - API Routes (Bedrock streaming)                 │   │   │
│   │   │  - SSR / React 19                                 │   │   │
│   │   └────────────────────┬──────────────────────────────┘   │   │
│   │                        │                                  │   │
│   └────────────────────────┼──────────────────────────────────┘   │
│                            │                                      │
│              ┌─────────────┼─────────────┐                        │
│              v             v             v                        │
│      ┌────────────┐ ┌──────────┐ ┌────────────┐                   │
│      │  Bedrock   │ │ DynamoDB │ │  Cognito   │                   │
│      │            │ │          │ │            │                   │
│      │  AI model  │ │  Chat    │ │  OIDC Auth │                   │
│      │  streaming │ │  history │ │            │                   │
│      └────────────┘ └──────────┘ └────────────┘                   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

              HTTPS (:443)
 ┌────────┐  ─────────────>  Nginx
 │ User   │
 │        │  <─────────────  Streaming response
 └────────┘

┌───────────────────────────────────────────────────────────────────┐
│  Certbot (Let's Encrypt)                                          │
│                                                                   │
│  /etc/letsencrypt/  -- SSL cert storage & auto-renewal            │
│  /var/www/certbot/  -- ACME challenge response                    │
└───────────────────────────────────────────────────────────────────┘
```

### アーキテクチャの詳細

**Nginx（リバースプロキシ）**
- ポート 443 で SSL 終端を行い、内部の `chat-app:3000` へプロキシ
- ポート 80 は HTTPS へのリダイレクトと Certbot の ACME チャレンジに使用
- `proxy_buffering off` でストリーミングレスポンスに対応
- リードタイムアウト 300 秒（長時間ストリーミング対応）

**chat-app（Next.js アプリケーション）**
- Docker マルチステージビルドで最適化（standalone 出力）
- 非 root ユーザー `nextjs` で実行
- `/api/health` エンドポイントによるヘルスチェック

**AWS サービス連携**
- **Bedrock** — AI モデル推論（ストリーミング対応）
- **DynamoDB** — `chatapp_chat` / `chatapp_message` テーブルでチャット履歴を永続化
- **Cognito** — OIDC 認証フロー（Authorization Code Flow）

## セットアップ

### 環境変数

```bash
# 必須
AWS_REGION=ap-northeast-1
NEXT_PUBLIC_REDIRECT_URL=https://your-domain.com

# オプション（IAM ロールへのフォールバックあり）
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
BEDROCK_MODEL_ID=google.gemma-3-4b-it
```

### ローカル開発

```bash
cd chat-app
npm install
npm run dev
```

### Docker デプロイ

```bash
docker build -t chat-app .
docker-compose up -d
```
