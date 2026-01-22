"""
自定义异常类

定义应用级别的异常，用于统一错误处理
"""

from typing import Any, Optional


class BaseAPIException(Exception):
    """
    API异常基类

    所有API异常都应继承此类
    """

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        detail: Optional[Any] = None,
    ) -> None:
        """
        初始化异常

        Args:
            message: 错误消息
            status_code: HTTP状态码
            detail: 错误详情
        """
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(self.message)


class NotFoundError(BaseAPIException):
    """资源未找到异常"""

    def __init__(self, message: str = "资源未找到", detail: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=404, detail=detail)


class BadRequestError(BaseAPIException):
    """请求参数错误异常"""

    def __init__(self, message: str = "请求参数错误", detail: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=400, detail=detail)


class UnauthorizedError(BaseAPIException):
    """未授权异常"""

    def __init__(self, message: str = "未授权访问", detail: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=401, detail=detail)


class ForbiddenError(BaseAPIException):
    """禁止访问异常"""

    def __init__(self, message: str = "禁止访问", detail: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=403, detail=detail)


class ConflictError(BaseAPIException):
    """资源冲突异常"""

    def __init__(self, message: str = "资源冲突", detail: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=409, detail=detail)


class InternalServerError(BaseAPIException):
    """服务器内部错误异常"""

    def __init__(self, message: str = "服务器内部错误", detail: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=500, detail=detail)


class DatabaseError(BaseAPIException):
    """数据库错误异常"""

    def __init__(self, message: str = "数据库操作失败", detail: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=500, detail=detail)
