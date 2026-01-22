"""
请求日志中间件

记录所有HTTP请求的详细信息
"""

import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import bind_request_id, get_logger

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    请求日志中间件

    记录每个HTTP请求的详细信息，包括：
    - 请求ID
    - 请求方法、路径
    - 请求处理时间
    - 响应状态码
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        处理请求并记录日志

        Args:
            request: HTTP请求对象
            call_next: 下一个中间件或路由处理函数

        Returns:
            Response: HTTP响应对象
        """
        # 生成请求ID
        request_id = str(uuid.uuid4())
        bind_request_id(request_id)

        # 记录请求开始时间
        start_time = time.time()

        # 记录请求信息
        logger.info(
            "请求开始",
            method=request.method,
            path=request.url.path,
            query_params=str(request.query_params),
            client_host=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )

        try:
            # 处理请求
            response = await call_next(request)

            # 计算处理时间
            process_time = time.time() - start_time

            # 记录响应信息
            logger.info(
                "请求完成",
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                process_time=f"{process_time:.3f}s",
            )

            # 添加请求ID到响应头
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.3f}"

            return response

        except Exception as e:
            # 计算处理时间
            process_time = time.time() - start_time

            # 记录错误信息
            logger.error(
                "请求失败",
                method=request.method,
                path=request.url.path,
                error=str(e),
                error_type=type(e).__name__,
                process_time=f"{process_time:.3f}s",
                exc_info=True,
            )

            raise
