"""
通用数据验证模型

包含通用的Pydantic模型
"""

from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class BaseSchema(BaseModel):
    """
    Schema基类

    所有Pydantic模型都应继承此类
    """

    class Config:
        """Pydantic配置"""

        from_attributes = True  # 允许从ORM对象创建
        populate_by_name = True  # 允许使用字段别名
        json_encoders = {
            # 自定义编码器可以在这里添加
        }


class TimestampSchema(BaseSchema):
    """
    包含时间戳的Schema基类
    """

    created_at: Optional[str] = Field(None, description="创建时间")
    updated_at: Optional[str] = Field(None, description="更新时间")
