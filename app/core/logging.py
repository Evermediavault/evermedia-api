"""
日志配置模块

使用structlog进行结构化日志记录
"""

import logging
import sys
from typing import Any

import structlog
from structlog.types import Processor

from app.core.config import settings


def setup_logging() -> None:
    """
    配置日志系统

    根据环境配置不同的日志格式：
    - 开发环境：控制台输出，便于阅读
    - 生产环境：JSON格式，便于日志收集和分析
    """
    # 配置标准库logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    )

    # 配置structlog处理器
    processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,  # 合并上下文变量
        structlog.processors.add_log_level,  # 添加日志级别
        structlog.processors.TimeStamper(fmt="iso"),  # 添加ISO格式时间戳
        structlog.processors.StackInfoRenderer(),  # 渲染堆栈信息
    ]

    # 根据配置选择日志格式
    if settings.LOG_FORMAT == "json" or settings.is_production:
        # 生产环境：JSON格式
        processors.extend(
            [
                structlog.processors.dict_tracebacks,  # 字典格式的堆栈跟踪
                structlog.processors.JSONRenderer(),  # JSON渲染器
            ]
        )
    else:
        # 开发环境：控制台格式
        processors.extend(
            [
                structlog.processors.ExceptionRenderer(),  # 异常渲染器
                structlog.dev.ConsoleRenderer(),  # 控制台渲染器
            ]
        )

    # 配置structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = __name__) -> structlog.BoundLogger:
    """
    获取日志记录器

    Args:
        name: 日志记录器名称，通常使用模块名

    Returns:
        structlog.BoundLogger: 配置好的日志记录器
    """
    return structlog.get_logger(name)


def bind_request_id(request_id: str) -> None:
    """
    绑定请求ID到日志上下文

    Args:
        request_id: 请求ID
    """
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)


def clear_context() -> None:
    """清除日志上下文"""
    structlog.contextvars.clear_contextvars()
