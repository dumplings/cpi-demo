import { expect } from "chai";

import {
  expectBn,
  expectPaymentSnapshotUnchanged,
  fetchPaymentSnapshot,
} from "../helpers/assertions";
import { PaymentRequestRef, TestContext } from "../helpers/context";
import { expectAnchorError } from "../helpers/errors";
import { executePendingPayment } from "../helpers/transactions";

function happyRequest(ctx: TestContext): PaymentRequestRef {
  if (!ctx.happyRequest) {
    throw new Error("Happy-path request has not been created");
  }
  return ctx.happyRequest;
}

export function registerPaymentExecutionTests(ctx: TestContext): void {
  describe("Payment execution", () => {
    it("executes a payment through the nested CPI chain", async () => {
      const request = happyRequest(ctx);
      const before = await fetchPaymentSnapshot(ctx, request);
      expect(before.requestStatus).to.equal("pending");
      let executionError: unknown;

      try {
        await executePendingPayment(ctx, request);
      } catch (error) {
        executionError = error;
      }

      const after = await fetchPaymentSnapshot(ctx, request);
      if (executionError) {
        expectPaymentSnapshotUnchanged(before, after);
        throw executionError;
      }
      expect(after.requestStatus).to.equal("executed");
      expect(after.recipientBalance - before.recipientBalance).to.equal(
        request.amount.toNumber()
      );
      expect(before.vaultBalance - after.vaultBalance).to.equal(
        request.amount.toNumber()
      );
      expectBn(
        after.inspectorTotalExecuted,
        before.inspectorTotalExecuted.add(request.amount),
        "inspector total_executed"
      );
      expectBn(
        after.executorTotalPaid,
        before.executorTotalPaid.add(request.amount),
        "executor total_paid"
      );
      expectBn(
        after.executorPaymentCount,
        before.executorPaymentCount.addn(1),
        "executor payment_count"
      );
    });

    it("rejects replay of an executed payment request", async function () {
      const request = happyRequest(ctx);
      const before = await fetchPaymentSnapshot(ctx, request);
      if (before.requestStatus !== "executed") {
        this.skip();
        return;
      }

      await expectAnchorError(() => executePendingPayment(ctx, request), {
        code: "InvalidPaymentRequestStatus",
        message: "Payment request is not pending",
        programId: ctx.inspectorProgram.programId,
      });

      const after = await fetchPaymentSnapshot(ctx, request);
      expectPaymentSnapshotUnchanged(before, after);
    });
  });
}
