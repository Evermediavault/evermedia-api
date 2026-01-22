"""
健康检查端点

提供应用健康状态检查接口
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.schemas.response import SuccessResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=SuccessResponse[dict[str, Any]],
    summary="健康检查",
    description="检查应用基本健康状态",
    tags=["健康检查"],
)
async def health_check() -> SuccessResponse[dict[str, Any]]:
    """
    基础健康检查

    检查应用是否正常运行

    Returns:
        SuccessResponse: 健康状态响应
    """
    return SuccessResponse(
        message="服务正常运行",
        data={
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT.value,
        },
    )


@router.get(
    "/health/live",
    response_model=SuccessResponse[dict[str, Any]],
    summary="存活检查",
    description="Kubernetes存活探针端点",
    tags=["健康检查"],
)
async def liveness_check() -> SuccessResponse[dict[str, Any]]:
    """
    存活检查

    用于Kubernetes存活探针，检查应用是否存活

    Returns:
        SuccessResponse: 存活状态响应
    """
    return SuccessResponse(
        message="服务存活",
        data={
            "status": "alive",
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


@router.get(
    "/health/ready",
    response_model=SuccessResponse[dict[str, Any]],
    summary="就绪检查",
    description="Kubernetes就绪探针端点，检查数据库连接",
    tags=["健康检查"],
)
async def readiness_check(
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse[dict[str, Any]]:
    """
    就绪检查

    用于Kubernetes就绪探针，检查应用是否就绪（包括数据库连接）

    Args:
        db: 数据库会话

    Returns:
        SuccessResponse: 就绪状态响应

    Raises:
        HTTPException: 如果数据库连接失败
    """
    try:
        # 检查数据库连接
        result = await db.execute(text("SELECT 1"))
        result.scalar()

        return SuccessResponse(
            message="服务就绪",
            data={
                "status": "ready",
                "timestamp": datetime.utcnow().isoformat(),
                "database": "connected",
            },
        )
    except Exception as e:
        return SuccessResponse(
            message="服务未就绪",
            data={
                "status": "not_ready",
                "timestamp": datetime.utcnow().isoformat(),
                "database": "disconnected",
                "error": str(e),
            },
        )
