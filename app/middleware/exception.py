"""
异常处理中间件

统一处理应用异常，返回标准化的错误响应
"""

from typing import Callable

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import BaseAPIException
from app.core.logging import get_logger

logger = get_logger(__name__)


class ExceptionMiddleware(BaseHTTPMiddleware):
    """
    异常处理中间件

    捕获所有未处理的异常，返回统一的错误响应格式
    """

    async def dispatch(self, request: Request, call_next: Callable) -> JSONResponse:
        """
        处理请求并捕获异常

        Args:
            request: HTTP请求对象
            call_next: 下一个中间件或路由处理函数

        Returns:
            JSONResponse: HTTP响应对象
        """
        try:
            response = await call_next(request)
            return response

        except BaseAPIException as e:
            # 处理自定义API异常
            logger.warning(
                "API异常",
                message=e.message,
                status_code=e.status_code,
                detail=e.detail,
            )
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "success": False,
                    "message": e.message,
                    "detail": e.detail,
                    "status_code": e.status_code,
                },
            )

        except SQLAlchemyError as e:
            # 处理数据库异常
            logger.error("数据库异常", error=str(e), exc_info=True)
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "message": "数据库操作失败",
                    "detail": str(e) if request.app.debug else None,
                    "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                },
            )

        except Exception as e:
            # 处理其他未预期的异常
            logger.error(
                "未处理的异常",
                error=str(e),
                error_type=type(e).__name__,
                exc_info=True,
            )
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "message": "服务器内部错误",
                    "detail": str(e) if request.app.debug else None,
                    "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                },
            )
