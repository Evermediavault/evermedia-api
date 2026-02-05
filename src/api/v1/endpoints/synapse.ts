/**
 * Synapse 管理接口：仅管理员可调用的链上操作
 * GET /synapse/wallet-info：钱包与 Payments 合约余额等信息（仅管理员）
 * POST /synapse/approve：存款 USDFC 并批准 Warm Storage operator（上传前需执行一次）
 */
import { FastifyPluginAsync } from "fastify";
import { ethers } from "ethers";
import { TIME_CONSTANTS, TOKENS } from "@filoz/synapse-sdk";
import { getSynapse } from "../../../synapse/client.js";
import { authToken, requireAuth, requireAdmin } from "../../../middleware/auth.js";
import { createSuccessResponse } from "../../../schemas/response.js";
import { getMsg } from "../../../i18n/utils.js";
import { BadRequestError, InternalServerError } from "../../../core/exceptions.js";
import { SynapseApproveBodySchema, type SynapseApproveBody } from "../../../schemas/synapse.js";

const DEFAULT_DEPOSIT = "2.5";

export const synapseRouter: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /synapse/wallet-info
   * 仅管理员；返回钱包 FIL/USDFC 余额、Payments 合约内资金与可用余额、网络；未配置 Synapse 时 503
   */
  fastify.get(
    "/wallet-info",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      const synapse = await getSynapse();
      if (!synapse) {
        throw new InternalServerError("log.synapse.notConfigured");
      }

      try {
        const [walletFil, walletUsdfc, accountInfo] = await Promise.all([
          synapse.payments.walletBalance(),
          synapse.payments.walletBalance(TOKENS.USDFC),
          synapse.payments.accountInfo(TOKENS.USDFC),
        ]);

        const network = synapse.getNetwork();
        const data = {
          network,
          wallet_fil_wei: String(walletFil),
          wallet_usdfc_wei: String(walletUsdfc),
          payments_funds_wei: String(accountInfo.funds),
          payments_available_funds_wei: String(accountInfo.availableFunds),
        };

        const message = getMsg(request, "success.list");
        return reply.status(200).send(createSuccessResponse(message, data));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new InternalServerError("log.synapse.walletInfoFailed", { error: msg });
      }
    },
  );

  fastify.post<{ Body: SynapseApproveBody }>(
    "/approve",
    { preHandler: [authToken, requireAuth, requireAdmin] },
    async (request, reply) => {
      const parsed = SynapseApproveBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw new BadRequestError("validation.invalidParams", parsed.error.flatten());
      }

      const synapse = await getSynapse();
      if (!synapse) {
        throw new InternalServerError("log.synapse.notConfigured");
      }

      const amountStr =
        parsed.data.deposit_amount?.trim() ||
        process.env.SYNAPSE_APPROVE_DEPOSIT_AMOUNT?.trim() ||
        DEFAULT_DEPOSIT;
      let depositAmount: bigint;
      try {
        depositAmount = ethers.parseUnits(amountStr, 18);
      } catch {
        throw new BadRequestError("validation.invalidParams", {
          deposit_amount: "Must be a valid decimal number",
        });
      }
      if (depositAmount <= 0n) {
        throw new BadRequestError("validation.invalidParams", {
          deposit_amount: "Must be positive",
        });
      }

      try {
        const tx = await synapse.payments.depositWithPermitAndApproveOperator(
          depositAmount,
          synapse.getWarmStorageAddress(),
          ethers.MaxUint256,
          ethers.MaxUint256,
          TIME_CONSTANTS.EPOCHS_PER_MONTH,
        );
        await tx.wait();
        const message = getMsg(request, "log.synapse.approveSuccess");
        return reply.status(200).send(
          createSuccessResponse(message, { tx_hash: tx.hash }),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new InternalServerError("log.synapse.approveFailed", { error: msg });
      }
    },
  );
};
