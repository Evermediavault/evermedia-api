# 快速开始指南

## 前置要求

- Node.js 20.0+
- MySQL 5.7+ 或 8.0+
- npm 或 yarn

## 安装步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 并创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接等信息。

**重要**: 确保设置 `DATABASE_URL` 环境变量，格式如下：

```
DATABASE_URL="mysql://用户名:密码@主机:端口/数据库名?charset=utf8mb4"
```

或者让系统自动从其他配置项构建（DB_HOST, DB_USER 等）。

### 3. 初始化数据库

```bash
# 生成 Prisma 客户端
npm run prisma:generate

# 如果数据库已存在，可以拉取现有结构
npx prisma db pull

# 或者推送 schema 到数据库（开发环境）
npm run prisma:push
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:8000` 启动。

## 验证安装

访问以下端点验证安装：

- 根路径: http://localhost:8000/
- 健康检查: http://localhost:8000/api/v1/health
- 存活检查: http://localhost:8000/api/v1/health/live
- 就绪检查: http://localhost:8000/api/v1/health/ready

## 常用命令

```bash
# 开发模式（热重载）
npm run dev

# 构建项目
npm run build

# 生产模式
npm start

# 运行测试
npm test

# 代码检查
npm run lint

# 格式化代码
npm run format

# Prisma Studio（数据库可视化）
npm run prisma:studio
```

## 下一步

- 查看 [README.md](./README.md) 了解详细文档
- 查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解如何贡献代码
