"""
应用配置管理模块

使用pydantic-settings管理环境变量，支持多环境配置
"""

from enum import Enum
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(str, Enum):
    """环境枚举"""

    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class Settings(BaseSettings):
    """
    应用配置类

    从环境变量读取配置，支持.env文件
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # 应用基础配置
    APP_NAME: str = Field(default="Evermediavault API", description="应用名称")
    APP_VERSION: str = Field(default="0.1.0", description="应用版本")
    APP_DESCRIPTION: str = Field(
        default="Evermediavault HTTP API服务", description="应用描述"
    )
    DEBUG: bool = Field(default=False, description="调试模式")
    ENVIRONMENT: Environment = Field(
        default=Environment.DEVELOPMENT, description="运行环境"
    )

    # API配置
    API_V1_PREFIX: str = Field(default="/api/v1", description="API v1前缀")
    API_DOCS_URL: Optional[str] = Field(default="/docs", description="API文档URL")
    API_REDOC_URL: Optional[str] = Field(default="/redoc", description="ReDoc文档URL")

    # 服务器配置
    HOST: str = Field(default="0.0.0.0", description="服务器监听地址")
    PORT: int = Field(default=8000, description="服务器端口")
    RELOAD: bool = Field(default=False, description="自动重载（开发模式）")

    # 数据库配置
    DB_HOST: str = Field(default="localhost", description="数据库主机")
    DB_PORT: int = Field(default=3306, description="数据库端口")
    DB_USER: str = Field(default="root", description="数据库用户名")
    DB_PASSWORD: str = Field(default="", description="数据库密码")
    DB_NAME: str = Field(default="evermediavault", description="数据库名称")
    DB_CHARSET: str = Field(default="utf8mb4", description="数据库字符集")
    DB_POOL_SIZE: int = Field(default=10, description="连接池大小")
    DB_MAX_OVERFLOW: int = Field(default=20, description="连接池最大溢出数")
    DB_POOL_RECYCLE: int = Field(default=3600, description="连接池回收时间（秒）")
    DB_ECHO: bool = Field(default=False, description="是否打印SQL语句")

    # 安全配置
    SECRET_KEY: str = Field(
        default="your-secret-key-change-in-production",
        description="密钥（用于JWT等）",
    )
    ALGORITHM: str = Field(default="HS256", description="JWT算法")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30, description="访问令牌过期时间（分钟）"
    )

    # CORS配置
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"],
        description="允许的CORS源",
    )
    CORS_CREDENTIALS: bool = Field(default=True, description="允许CORS凭证")
    CORS_METHODS: list[str] = Field(
        default=["*"], description="允许的HTTP方法"
    )
    CORS_HEADERS: list[str] = Field(
        default=["*"], description="允许的HTTP头"
    )

    # 日志配置
    LOG_LEVEL: str = Field(default="INFO", description="日志级别")
    LOG_FORMAT: str = Field(
        default="json", description="日志格式（json或console）"
    )

    @field_validator("ENVIRONMENT", mode="before")
    @classmethod
    def validate_environment(cls, v: str) -> Environment:
        """验证环境变量"""
        if isinstance(v, str):
            v = v.lower()
            try:
                return Environment(v)
            except ValueError:
                return Environment.DEVELOPMENT
        return v

    @field_validator("LOG_LEVEL", mode="before")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """验证日志级别"""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if isinstance(v, str):
            v = v.upper()
            if v in valid_levels:
                return v
        return "INFO"

    @property
    def database_url(self) -> str:
        """
        构建数据库连接URL

        Returns:
            str: 数据库连接URL
        """
        return (
            f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset={self.DB_CHARSET}"
        )

    @property
    def is_development(self) -> bool:
        """是否为开发环境"""
        return self.ENVIRONMENT == Environment.DEVELOPMENT

    @property
    def is_production(self) -> bool:
        """是否为生产环境"""
        return self.ENVIRONMENT == Environment.PRODUCTION

    @property
    def is_testing(self) -> bool:
        """是否为测试环境"""
        return self.ENVIRONMENT == Environment.TESTING


# 全局配置实例
settings = Settings()
