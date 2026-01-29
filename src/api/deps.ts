import { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../db/client.js";
import { getSynapse } from "../synapse/client.js";

/**
 * 获取数据库客户端（全局单例，与 app 生命周期一致，由 dbPlugin 在 onClose 时断开）
 */
export const getDb = (): PrismaClient => getPrismaClient();

/**
 * 获取 Synapse 客户端（懒加载单例，需配置 SYNAPSE_PRIVATE_KEY）
 * @returns Synapse 实例或 null
 */
export const getSynapseClient = getSynapse;
