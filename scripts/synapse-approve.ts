/**
 * One-time script: deposit USDFC and approve Warm Storage operator.
 * Run once with the same SYNAPSE_PRIVATE_KEY as the API so uploads can succeed.
 *
 * Usage: npm run synapse:approve
 * Optional env: SYNAPSE_APPROVE_DEPOSIT_AMOUNT=2.5 (default 2.5 USDFC)
 */
import "dotenv/config";
import { ethers } from "ethers";
import { Synapse, TIME_CONSTANTS } from "@filoz/synapse-sdk";
import { getSynapse } from "../src/synapse/client.js";

const DEFAULT_DEPOSIT = "2.5";

async function main() {
  const synapse = await getSynapse();
  if (!synapse) {
    console.error("❌ Synapse not initialized. Set SYNAPSE_PRIVATE_KEY in .env");
    process.exit(1);
  }

  const amountStr = process.env.SYNAPSE_APPROVE_DEPOSIT_AMOUNT ?? DEFAULT_DEPOSIT;
  const depositAmount = ethers.parseUnits(amountStr, 18);

  console.log(`Depositing ${amountStr} USDFC and approving Warm Storage operator...`);
  const tx = await synapse.payments.depositWithPermitAndApproveOperator(
    depositAmount,
    synapse.getWarmStorageAddress(),
    ethers.MaxUint256,
    ethers.MaxUint256,
    TIME_CONSTANTS.EPOCHS_PER_MONTH,
  );
  console.log(`Tx hash: ${tx.hash}`);
  await tx.wait();
  console.log("✅ Deposit and Warm Storage operator approval successful. You can upload now.");
}

main().catch((err) => {
  console.error("❌", err.message);
  if (err.cause) console.error(err.cause);
  process.exit(1);
});
