"""
API v1 路由聚合

聚合所有v1版本的API端点
"""

from fastapi import APIRouter

from app.api.v1.endpoints import health

# 创建v1版本的路由器
api_router = APIRouter()

# 注册健康检查路由
api_router.include_router(health.router, tags=["健康检查"])

# 在这里添加其他路由
# api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
# api_router.include_router(users.router, prefix="/users", tags=["用户"])
