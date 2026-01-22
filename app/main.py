"""
FastAPI应用主入口

创建并配置FastAPI应用，集成所有中间件和路由
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.middleware.cors import setup_cors
from app.middleware.exception import ExceptionMiddleware
from app.middleware.logging import LoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    应用生命周期管理

    在应用启动和关闭时执行必要的操作

    Args:
        app: FastAPI应用实例

    Yields:
        None
    """
    # 启动时执行
    setup_logging()
    from app.core.logging import get_logger

    logger = get_logger(__name__)
    logger.info("应用启动", environment=settings.ENVIRONMENT.value)

    yield

    # 关闭时执行
    logger.info("应用关闭")


def create_application() -> FastAPI:
    """
    创建FastAPI应用实例

    Returns:
        FastAPI: 配置好的FastAPI应用实例
    """
    # 创建FastAPI应用
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=settings.APP_DESCRIPTION,
        docs_url=settings.API_DOCS_URL if not settings.is_production else None,
        redoc_url=settings.API_REDOC_URL if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # 添加GZip压缩中间件
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # 添加请求日志中间件
    app.add_middleware(LoggingMiddleware)

    # 添加异常处理中间件
    app.add_middleware(ExceptionMiddleware)

    # 配置CORS
    setup_cors(app)

    # 注册API路由
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # 根路径
    @app.get("/", tags=["根路径"])
    async def root() -> JSONResponse:
        """
        根路径

        Returns:
            JSONResponse: 欢迎信息
        """
        return JSONResponse(
            content={
                "message": f"欢迎使用 {settings.APP_NAME}",
                "version": settings.APP_VERSION,
                "docs_url": settings.API_DOCS_URL,
            }
        )

    return app


# 创建应用实例
app = create_application()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower(),
    )
