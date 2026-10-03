import { expect } from "chai";
import * as anchor from "@anchor-lang/core";

import { PaymentRequestRef, TestContext } from "./context";

export interface PaymentSnapshot {
  requestStatus: string;
  inspectorTotalExecuted: anchor.BN;
  executorTotalPaid: anchor.BN;
  executorPaymentCount: anchor.BN;
  recipientBalance: number;
  vaultBalance: number;
}

function statusName(status: Record<string, unknown>): string {
  const names = Object.keys(status);
  if (names.length !== 1) {
    throw new Error(`Unexpected payment status: ${JSON.stringify(status)}`);
  }
  return names[0];
}

export function expectBn(
  actual: anchor.BN,
  expected: anchor.BN | number,
  label: string
): void {
  const expectedBn = anchor.BN.isBN(expected)
    ? expected
    : new anchor.BN(expected);
  expect(actual.eq(expectedBn), label).to.equal(true);
}

export function expectPublicKey(
  actual: anchor.web3.PublicKey,
  expected: anchor.web3.PublicKey,
  label: string
): void {
  expect(actual.equals(expected), label).to.equal(true);
}

export async function expectPending(
  ctx: TestContext,
  request: PaymentRequestRef
): Promise<void> {
  const account = await ctx.inspectorProgram.account.paymentRequest.fetch(
    request.address
  );
  expect(statusName(account.status)).to.equal("pending");
}

export async function fetchPaymentSnapshot(
  ctx: TestContext,
  request: PaymentRequestRef
): Promise<PaymentSnapshot> {
  const [payment, policy, treasury, recipientBalance, vaultBalance] =
    await Promise.all([
      ctx.inspectorProgram.account.paymentRequest.fetch(request.address),
      ctx.inspectorProgram.account.policyConfig.fetch(ctx.policyConfig),
      ctx.executorProgram.account.treasuryState.fetch(ctx.treasuryState),
      ctx.provider.connection.getBalance(request.recipient),
      ctx.provider.connection.getBalance(ctx.treasuryVault),
    ]);

  return {
    requestStatus: statusName(payment.status),
    inspectorTotalExecuted: policy.totalExecuted,
    executorTotalPaid: treasury.totalPaid,
    executorPaymentCount: treasury.paymentCount,
    recipientBalance,
    vaultBalance,
  };
}

export function expectPaymentSnapshotUnchanged(
  before: PaymentSnapshot,
  after: PaymentSnapshot
): void {
  expect(after.requestStatus).to.equal(before.requestStatus);
  expectBn(
    after.inspectorTotalExecuted,
    before.inspectorTotalExecuted,
    "inspector total_executed should not change"
  );
  expectBn(
    after.executorTotalPaid,
    before.executorTotalPaid,
    "executor total_paid should not change"
  );
  expectBn(
    after.executorPaymentCount,
    before.executorPaymentCount,
    "executor payment_count should not change"
  );
  expect(after.recipientBalance).to.equal(before.recipientBalance);
  expect(after.vaultBalance).to.equal(before.vaultBalance);
}
