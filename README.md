# Evermediavault API

企业级Python HTTP API服务，基于FastAPI框架构建。

## 项目特性

- 🚀 **FastAPI**: 现代、高性能的Python Web框架
- 🗄️ **MySQL**: 使用SQLAlchemy异步ORM进行数据库操作
- 📝 **类型提示**: 完整的Python类型注解支持
- 🔒 **安全**: JWT认证、密码加密、CORS配置
- 📊 **日志**: 结构化日志记录（structlog）
- 🧪 **测试**: pytest测试框架支持
- 🛠️ **代码质量**: black、isort、mypy、ruff代码检查和格式化

## 技术栈

- **Web框架**: FastAPI 0.115+
- **数据库**: MySQL (SQLAlchemy + aiomysql)
- **配置管理**: pydantic-settings
- **日志**: structlog
- **依赖管理**: Poetry
- **代码规范**: black, isort, mypy, ruff

## 项目结构

```
api/
├── app/
│   ├── main.py                 # FastAPI应用入口
│   ├── core/                   # 核心功能模块
│   │   ├── config.py           # 配置管理
│   │   ├── security.py         # 安全相关
│   │   ├── logging.py           # 日志配置
│   │   └── exceptions.py        # 自定义异常
│   ├── db/                     # 数据库相关
│   │   ├── base.py             # 数据库基类
│   │   ├── session.py          # 数据库会话管理
│   │   └── base_class.py       # ORM基类
│   ├── api/                    # API路由层
│   │   ├── deps.py             # 依赖注入
│   │   └── v1/                 # API版本1
│   │       ├── router.py       # 路由聚合
│   │       └── endpoints/      # 具体端点
│   ├── models/                 # SQLAlchemy ORM模型
│   ├── schemas/                # Pydantic数据验证模型
│   ├── services/               # 业务逻辑层
│   ├── utils/                  # 工具函数
│   └── middleware/             # 中间件
├── tests/                      # 测试目录
├── scripts/                    # 脚本目录
├── .env.example                # 环境变量示例
├── pyproject.toml              # Poetry配置
└── README.md                   # 项目说明
```

## 快速开始

### 1. 环境要求

- Python 3.11+
- MySQL 5.7+ 或 8.0+
- Poetry (推荐) 或 pip

### 2. 安装依赖

使用Poetry（推荐）:

```bash
# 安装Poetry
curl -sSL https://install.python-poetry.org | python3 -

# 安装项目依赖
poetry install
```

或使用pip:

```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

复制环境变量示例文件并修改配置:

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接等信息。

### 4. 运行应用

开发模式:

```bash
# 使用Poetry
poetry run uvicorn app.main:app --reload

# 或使用Python
python -m app.main
```

生产模式:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 5. 访问API文档

启动应用后，访问以下URL查看API文档:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 开发指南

### 代码格式化

```bash
# 使用black格式化代码
poetry run black .

# 使用isort整理导入
poetry run isort .

# 使用ruff检查代码
poetry run ruff check .
```

### 类型检查

```bash
poetry run mypy app/
```

### 运行测试

```bash
poetry run pytest
```

### 代码提交前检查

项目配置了pre-commit钩子，提交代码前会自动运行代码检查和格式化:

```bash
poetry run pre-commit install
```

## API端点

### 健康检查

- `GET /health` - 基础健康检查
- `GET /health/live` - 存活检查（Kubernetes探针）
- `GET /health/ready` - 就绪检查（Kubernetes探针，包含数据库连接检查）

## 环境变量说明

主要环境变量配置（详见 `.env.example`）:

- `APP_NAME`: 应用名称
- `ENVIRONMENT`: 运行环境 (development/staging/production)
- `DB_HOST`: 数据库主机
- `DB_PORT`: 数据库端口
- `DB_USER`: 数据库用户名
- `DB_PASSWORD`: 数据库密码
- `DB_NAME`: 数据库名称
- `SECRET_KEY`: JWT密钥（生产环境必须修改）
- `LOG_LEVEL`: 日志级别 (DEBUG/INFO/WARNING/ERROR/CRITICAL)

## 安全注意事项

1. **生产环境必须修改 `SECRET_KEY`**: 使用强随机密钥
2. **数据库密码**: 使用强密码，不要使用默认密码
3. **CORS配置**: 根据实际需求配置允许的源
4. **环境变量**: 不要将 `.env` 文件提交到版本控制系统

## 许可证

[添加许可证信息]

## 贡献

欢迎提交Issue和Pull Request！
