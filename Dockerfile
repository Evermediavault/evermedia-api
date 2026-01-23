# 多阶段构建 Dockerfile

# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建 TypeScript
RUN npm run build

# 生产阶段
FROM node:20-alpine AS production

WORKDIR /app

# 安装生产依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 8000

# 启动应用
CMD ["node", "dist/server.js"]
