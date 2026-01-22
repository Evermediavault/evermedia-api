"""
pytest配置文件

定义测试用的fixtures和配置
"""

from typing import AsyncGenerator

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base
from app.main import app

# 测试数据库URL（使用内存数据库或测试数据库）
TEST_DATABASE_URL = settings.database_url.replace(
    settings.DB_NAME, f"{settings.DB_NAME}_test"
)

# 创建测试数据库引擎
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

# 创建测试会话工厂
TestSessionLocal = sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    测试数据库会话fixture

    Yields:
        AsyncSession: 测试数据库会话
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    测试客户端fixture

    Yields:
        AsyncClient: 测试HTTP客户端
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
