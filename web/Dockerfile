# ---- 构建后端依赖 ----
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY web/server/package*.json ./
RUN npm install
COPY web/server/ ./

# ---- 最终镜像 ----
FROM node:20-alpine
WORKDIR /app

# 复制后端（含 node_modules）
COPY --from=server-builder /app/server ./server

# 直接复制本地已构建的前端静态文件
COPY web/client/dist ./client/dist

EXPOSE 3000

ENV NODE_ENV=production

WORKDIR /app/server
CMD ["node_modules/.bin/tsx", "index.ts"]
