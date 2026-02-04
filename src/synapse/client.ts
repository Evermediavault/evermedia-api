import { Synapse, RPC_URLS } from "@filoz/synapse-sdk";
import { getLogger } from "../core/logger.js";
import { settings } from "../core/config.js";

const logger = getLogger("synapse");

/** Synapse 实例类型（SDK 为 private 构造，此处用 Awaited 推断） */
type SynapseInstance = Awaited<ReturnType<typeof Synapse.create>>;

/** 单例实例，仅当配置了 SYNAPSE_PRIVATE_KEY 且初始化成功时存在 */
let synapseInstance: SynapseInstance | null = null;

/** 初始化中的 Promise，避免并发重复创建 */
let initPromise: Promise<SynapseInstance | null> | null = null;

/**
 * 获取 Synapse 实例（懒加载单例）
 *
 * - 私钥仅从 process.env.SYNAPSE_PRIVATE_KEY 读取，不入配置，不落日志
 * - 未配置私钥时返回 null，调用方需做空值判断
 *
 * @returns 已初始化的 Synapse 实例，或 null（未配置 / 初始化失败）
 */
export const getSynapse = async (): Promise<SynapseInstance | null> => {
  const privateKey = process.env.SYNAPSE_PRIVATE_KEY?.trim();
  if (!privateKey) {
    return null;
  }

  if (synapseInstance) {
    return synapseInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async (): Promise<SynapseInstance | null> => {
    try {
      const network = settings.SYNAPSE_NETWORK;
      const rpcURL =
        settings.SYNAPSE_RPC_URL ||
        (network === "mainnet" ? RPC_URLS.mainnet.websocket : RPC_URLS.calibration.websocket);
      const instance = await Synapse.create({
        privateKey,
        rpcURL,
        withCDN: settings.SYNAPSE_WITH_CDN,
        dev: settings.SYNAPSE_DEV,
      });

      synapseInstance = instance;
      logger.info({
        message: "Synapse 客户端已初始化",
        network: instance.getNetwork(),
      });
      return instance;
    } catch (err) {
      logger.error({
        message: "Synapse 初始化失败",
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
};

/**
 * 关闭 Synapse 客户端并释放单例（用于应用关闭时）
 */
export const disconnectSynapse = async (): Promise<void> => {
  if (synapseInstance) {
    synapseInstance = null;
    initPromise = null;
    logger.info({ message: "Synapse 客户端已断开" });
  }
};
