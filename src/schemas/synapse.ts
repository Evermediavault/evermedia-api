import { z } from "zod";

/** POST /synapse/approve 请求体：可选存款金额（USDFC 字符串，如 "2.5"） */
export const SynapseApproveBodySchema = z.object({
  deposit_amount: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+(\.\d+)?$/.test(v) && Number(v) > 0, {
      message: "deposit_amount must be a positive number string",
    }),
});
export type SynapseApproveBody = z.infer<typeof SynapseApproveBodySchema>;
