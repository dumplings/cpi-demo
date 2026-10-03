import { expect } from "chai";
import * as anchor from "@anchor-lang/core";

import {
  expectPaymentSnapshotUnchanged,
  fetchPaymentSnapshot,
} from "../helpers/assertions";
import { MAX_PAYMENT, TestContext } from "../helpers/context";
import { expectAnchorError } from "../helpers/errors";
import {
  createPendingPayment,
  executePendingPayment,
} from "../helpers/transactions";

export function registerRollbackTests(ctx: TestContext): void {
  describe("CPI rollback", () => {
    it("rolls back the payment when the treasury has insufficient funds", async () => {
      const request = await createPendingPayment(
        ctx,
        ctx.receiver.publicKey,
        new anchor.BN(MAX_PAYMENT)
      );
      const rentReserve =
        await ctx.provider.connection.getMinimumBalanceForRentExemption(0);
      const before = await fetchPaymentSnapshot(ctx, request);
      const transferableBalance = before.vaultBalance - rentReserve;
      expect(request.amount.toNumber()).to.be.greaterThan(transferableBalance);

      await expectAnchorError(() => executePendingPayment(ctx, request), {
        code: "InsufficientTreasuryFunds",
        message: "Insufficient treasury funds",
        programId: ctx.executorProgram.programId,
      });

      const after = await fetchPaymentSnapshot(ctx, request);
      expect(after.requestStatus).to.equal("pending");
      expectPaymentSnapshotUnchanged(before, after);
    });
  });
}
