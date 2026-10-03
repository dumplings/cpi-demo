import { expect } from "chai";
import * as anchor from "@anchor-lang/core";

import { expectBn, expectPublicKey } from "../helpers/assertions";
import { MAX_PAYMENT, PAYMENT_AMOUNT, TestContext } from "../helpers/context";
import { expectAnchorError } from "../helpers/errors";
import { derivePaymentRequestPda } from "../helpers/pdas";
import { createPendingPayment } from "../helpers/transactions";

export function registerPaymentRequestTests(ctx: TestContext): void {
  describe("Payment request", () => {
    it("rejects payment request creation by an unauthorized requester", async () => {
      const before = await ctx.inspectorProgram.account.policyConfig.fetch(
        ctx.policyConfig
      );
      const [requestAddress] = derivePaymentRequestPda(
        ctx.inspectorProgram.programId,
        ctx.policyConfig,
        before.requestCount
      );

      await expectAnchorError(
        () =>
          ctx.inspectorProgram.methods
            .createPaymentRequest(
              ctx.receiver.publicKey,
              new anchor.BN(PAYMENT_AMOUNT)
            )
            .accountsStrict({
              requester: ctx.attacker.publicKey,
              policyConfig: ctx.policyConfig,
              paymentRequest: requestAddress,
              systemProgram: ctx.systemProgram,
            })
            .signers([ctx.attacker])
            .rpc(),
        {
          code: "ConstraintAddress",
          origin: "requester",
          programId: ctx.inspectorProgram.programId,
        }
      );

      const after = await ctx.inspectorProgram.account.policyConfig.fetch(
        ctx.policyConfig
      );
      expectBn(after.requestCount, before.requestCount, "request_count");
      expect(await ctx.provider.connection.getAccountInfo(requestAddress)).to.be
        .null;
    });

    it("rejects a payment above the policy limit", async () => {
      const before = await ctx.inspectorProgram.account.policyConfig.fetch(
        ctx.policyConfig
      );
      const [requestAddress] = derivePaymentRequestPda(
        ctx.inspectorProgram.programId,
        ctx.policyConfig,
        before.requestCount
      );

      await expectAnchorError(
        () =>
          ctx.inspectorProgram.methods
            .createPaymentRequest(
              ctx.receiver.publicKey,
              new anchor.BN(MAX_PAYMENT + 1)
            )
            .accountsStrict({
              requester: ctx.operator.publicKey,
              policyConfig: ctx.policyConfig,
              paymentRequest: requestAddress,
              systemProgram: ctx.systemProgram,
            })
            .signers([ctx.operator])
            .rpc(),
        {
          code: "PaymentExceedsPolicyLimit",
          message: "Payment amount exceeds policy limit",
          programId: ctx.inspectorProgram.programId,
        }
      );

      const after = await ctx.inspectorProgram.account.policyConfig.fetch(
        ctx.policyConfig
      );
      expectBn(after.requestCount, before.requestCount, "request_count");
      expect(await ctx.provider.connection.getAccountInfo(requestAddress)).to.be
        .null;
    });

    it("creates a pending payment request", async () => {
      const before = await ctx.inspectorProgram.account.policyConfig.fetch(
        ctx.policyConfig
      );
      const request = await createPendingPayment(ctx);
      ctx.happyRequest = request;

      const [payment, after] = await Promise.all([
        ctx.inspectorProgram.account.paymentRequest.fetch(request.address),
        ctx.inspectorProgram.account.policyConfig.fetch(ctx.policyConfig),
      ]);

      expectPublicKey(payment.policy, ctx.policyConfig, "request policy");
      expectPublicKey(payment.requester, ctx.operator.publicKey, "requester");
      expectPublicKey(payment.recipient, request.recipient, "recipient");
      expectBn(payment.amount, request.amount, "amount");
      expectBn(payment.requestId, before.requestCount, "request_id");
      expect(payment.status).to.deep.equal({ pending: {} });
      expectBn(
        after.requestCount,
        before.requestCount.addn(1),
        "next request_id"
      );
    });
  });
}
