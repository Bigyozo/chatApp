# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY chat-app/package.json chat-app/package-lock.json ./
# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY chat-app/package.json chat-app/package-lock.json ./
# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY chat-app/ ./

# Build-time env vars for Next.js public variables (ビルド時にクライアントバンドルへ埋め込まれる)
ARG NEXT_PUBLIC_REDIRECT_URL
ENV NEXT_PUBLIC_REDIRECT_URL=$NEXT_PUBLIC_REDIRECT_URL

ARG NEXT_PUBLIC_COGNITO_AUTHORITY
ENV NEXT_PUBLIC_COGNITO_AUTHORITY=$NEXT_PUBLIC_COGNITO_AUTHORITY

ARG NEXT_PUBLIC_COGNITO_CLIENT_ID
ENV NEXT_PUBLIC_COGNITO_CLIENT_ID=$NEXT_PUBLIC_COGNITO_CLIENT_ID

# Build the Next.js application
RUN npm run build

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# PORT はビルド時 ARG で上書き可能（デフォルト 3001）
ARG PORT=3001
ENV PORT=$PORT

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Change ownership to nextjs user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]
