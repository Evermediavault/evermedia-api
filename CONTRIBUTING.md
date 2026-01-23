# 贡献指南

感谢您对 Evermediavault API 项目的关注！本文档将帮助您了解如何为项目做出贡献。

## 开发环境设置

1. **克隆仓库**
   ```bash
   git clone <repository-url>
   cd Evermediavault/api
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置数据库连接等信息
   ```

4. **初始化数据库**
   ```bash
   npm run prisma:generate
   npm run prisma:push
   ```

5. **启动开发服务器**
   ```bash
   npm run dev
   ```

## 代码规范

### TypeScript

- 使用严格模式
- 所有函数必须有明确的返回类型
- 使用 `async/await` 而不是 Promise 链
- 使用 ES 模块 (`import/export`)

### 代码格式化

项目使用 Prettier 进行代码格式化，提交前请运行：

```bash
npm run format
```

### 代码检查

使用 ESLint 进行代码检查：

```bash
npm run lint
# 自动修复
npm run lint:fix
```

### 类型检查

```bash
npm run type-check
```

## 提交规范

提交信息应遵循以下格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型 (type):
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(api): 添加用户认证端点

实现了 JWT 认证功能，包括登录和令牌刷新

Closes #123
```

## 测试

在提交代码前，请确保所有测试通过：

```bash
npm test
```

编写新功能时，请添加相应的测试用例。

## Pull Request

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 问题报告

如果发现 bug 或有功能建议，请创建 Issue，并包含：
- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 环境信息（Node.js 版本、操作系统等）

## 许可证

通过贡献代码，您同意您的贡献将在项目的许可证下发布。
