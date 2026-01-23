# Evermediavault API

企业级 Node.js HTTP API 服务，基于 Fastify 框架构建。

## 项目特性

- 🚀 **Fastify**: 高性能、现代化的 Node.js Web 框架
- 🗄️ **MySQL**: 使用 Prisma ORM 进行数据库操作
- 📝 **TypeScript**: 完整的类型安全支持
- 🔒 **安全**: JWT 认证、密码加密、CORS 配置
- 📊 **日志**: 结构化日志记录（Pino）
- 🧪 **测试**: Vitest 测试框架支持
- 🛠️ **代码质量**: ESLint、Prettier 代码检查和格式化

## 技术栈

- **Web 框架**: Fastify 5.0+
- **数据库**: MySQL (Prisma ORM)
- **配置管理**: dotenv + Zod
- **日志**: Pino
- **依赖管理**: npm
- **代码规范**: ESLint, Prettier

## 项目结构

```
api/
├── src/
│   ├── app.ts                 # Fastify 应用入口
│   ├── server.ts              # 服务器启动文件
│   ├── core/                  # 核心功能模块
│   │   ├── config.ts          # 配置管理
│   │   ├── security.ts        # 安全相关
│   │   ├── logger.ts          # 日志配置
│   │   └── exceptions.ts      # 自定义异常
│   ├── db/                    # 数据库相关
│   │   ├── client.ts          # Prisma 客户端
│   │   └── session.ts         # 数据库会话管理
│   ├── api/                   # API 路由层
│   │   ├── deps.ts            # 依赖注入
│   │   └── v1/                # API 版本1
│   │       ├── router.ts      # 路由聚合
│   │       └── endpoints/      # 具体端点
│   ├── schemas/               # Zod 数据验证模型
│   ├── services/              # 业务逻辑层
│   ├── utils/                 # 工具函数
│   └── middleware/            # 中间件
├── prisma/                    # Prisma 配置
│   ├── schema.prisma          # 数据库模式定义
│   └── migrations/            # 数据库迁移
├── tests/                     # 测试目录
├── .env.example               # 环境变量示例
├── package.json               # 依赖配置
├── tsconfig.json              # TypeScript 配置
└── README.md                  # 项目说明
```

## 快速开始

### 1. 环境要求

- Node.js 20.0+
- MySQL 5.7+ 或 8.0+
- npm 或 yarn

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制环境变量示例文件并修改配置:

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接等信息。

**重要**: 需要设置 `DATABASE_URL` 环境变量，格式如下：

```
DATABASE_URL="mysql://用户名:密码@主机:端口/数据库名?charset=utf8mb4"
```

### 4. 初始化数据库

```bash
# 生成 Prisma 客户端
npm run prisma:generate

# 运行数据库迁移（如果有迁移文件）
npm run prisma:migrate

# 或者直接推送 schema 到数据库（开发环境）
npm run prisma:push
```

### 5. 运行应用

开发模式:

```bash
npm run dev
```

生产模式:

```bash
# 构建项目
npm run build

# 启动服务器
npm start
```

### 6. 访问 API

启动应用后，访问以下 URL:

- API 根路径: http://localhost:8000/
- 健康检查: http://localhost:8000/api/v1/health

## 开发指南

### 代码格式化

```bash
# 检查代码格式
npm run format:check

# 格式化代码
npm run format
```

### 代码检查

```bash
# 运行 ESLint
npm run lint

# 自动修复 ESLint 问题
npm run lint:fix
```

### 运行测试

```bash
# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 数据库管理

```bash
# 生成 Prisma 客户端
npm run prisma:generate

# 创建新的迁移
npm run prisma:migrate

# 打开 Prisma Studio（数据库可视化工具）
npm run prisma:studio

# 推送 schema 到数据库（不创建迁移）
npm run prisma:push
```

## API 端点

### 健康检查

- `GET /api/v1/health` - 基础健康检查
- `GET /api/v1/health/live` - 存活检查（Kubernetes 探针）
- `GET /api/v1/health/ready` - 就绪检查（Kubernetes 探针，包含数据库连接检查）

## 环境变量说明

主要环境变量配置（详见 `.env.example`）:

- `APP_NAME`: 应用名称
- `ENVIRONMENT`: 运行环境 (development/staging/production)
- `HOST`: 服务器监听地址
- `PORT`: 服务器端口
- `DB_HOST`: 数据库主机
- `DB_PORT`: 数据库端口
- `DB_USER`: 数据库用户名
- `DB_PASSWORD`: 数据库密码
- `DB_NAME`: 数据库名称
- `DATABASE_URL`: Prisma 数据库连接 URL（自动生成或手动设置）
- `SECRET_KEY`: JWT 密钥（生产环境必须修改）
- `LOG_LEVEL`: 日志级别 (DEBUG/INFO/WARNING/ERROR/CRITICAL)
- `LOG_FORMAT`: 日志格式 (json/console)

## 安全注意事项

1. **生产环境必须修改 `SECRET_KEY`**: 使用强随机密钥
2. **数据库密码**: 使用强密码，不要使用默认密码
3. **CORS 配置**: 根据实际需求配置允许的源
4. **环境变量**: 不要将 `.env` 文件提交到版本控制系统
5. **数据库连接**: 使用连接池，避免连接泄漏

## 许可证

[添加许可证信息]

## 贡献

欢迎提交 Issue 和 Pull Request！
