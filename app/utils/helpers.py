"""
辅助工具函数

包含各种通用的辅助函数
"""

from typing import Any


def safe_int(value: Any, default: int = 0) -> int:
    """
    安全地将值转换为整数

    Args:
        value: 要转换的值
        default: 转换失败时的默认值

    Returns:
        int: 转换后的整数值
    """
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def safe_float(value: Any, default: float = 0.0) -> float:
    """
    安全地将值转换为浮点数

    Args:
        value: 要转换的值
        default: 转换失败时的默认值

    Returns:
        float: 转换后的浮点数值
    """
    try:
        return float(value)
    except (ValueError, TypeError):
        return default
