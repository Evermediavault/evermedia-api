"""
依赖注入模块

定义FastAPI依赖项，用于依赖注入
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

# 导出数据库会话依赖，供路由使用
__all__ = ["get_db"]
