"""
API响应模型

定义统一的API响应格式
"""

from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class BaseResponse(BaseModel, Generic[T]):
    """
    基础响应模型

    所有API响应都应使用此格式
    """

    success: bool = Field(..., description="请求是否成功")
    message: str = Field(..., description="响应消息")
    data: Optional[T] = Field(None, description="响应数据")
    detail: Optional[Any] = Field(None, description="详细信息")


class SuccessResponse(BaseResponse[T]):
    """
    成功响应模型

    用于返回成功响应的API端点
    """

    success: bool = Field(default=True, description="请求是否成功")


class ErrorResponse(BaseResponse[None]):
    """
    错误响应模型

    用于返回错误响应的API端点
    """

    success: bool = Field(default=False, description="请求是否成功")
    status_code: int = Field(..., description="HTTP状态码")


class PaginationMeta(BaseModel):
    """
    分页元数据
    """

    page: int = Field(..., description="当前页码", ge=1)
    page_size: int = Field(..., description="每页数量", ge=1)
    total: int = Field(..., description="总记录数", ge=0)
    total_pages: int = Field(..., description="总页数", ge=0)

    @classmethod
    def create(cls, page: int, page_size: int, total: int) -> "PaginationMeta":
        """
        创建分页元数据

        Args:
            page: 当前页码
            page_size: 每页数量
            total: 总记录数

        Returns:
            PaginationMeta: 分页元数据实例
        """
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        return cls(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
        )


class PaginatedResponse(BaseResponse[list[T]]):
    """
    分页响应模型

    用于返回分页数据的API端点
    """

    success: bool = Field(default=True, description="请求是否成功")
    data: list[T] = Field(default_factory=list, description="数据列表")
    meta: Optional[PaginationMeta] = Field(None, description="分页元数据")
