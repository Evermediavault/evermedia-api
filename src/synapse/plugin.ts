import type { FastifyPluginAsync } from "fastify";
import { Synapse } from "@filoz/synapse-sdk";
import { getSynapse, disconnectSynapse } from "./client.js";

/** Synapse 实例类型（与 client 一致） */
type SynapseInstance = Awaited<ReturnType<typeof Synapse.create>>;

declare module "fastify" {
  interface FastifyInstance {
    /** Synapse 客户端，未配置 SYNAPSE_PRIVATE_KEY 时为 null */
    synapse: SynapseInstance | null;
  }
}

/**
 * Synapse 插件：为 Fastify 注入 Synapse 客户端
 *
 * - 懒加载单例，未配置私钥时 fastify.synapse 为 null
 * - 应用关闭时自动断开并释放单例
 */
export const synapsePlugin: FastifyPluginAsync = async (fastify) => {
  const synapse = await getSynapse();
  fastify.decorate("synapse", synapse);

  fastify.addHook("onClose", async () => {
    await disconnectSynapse();
  });
};
