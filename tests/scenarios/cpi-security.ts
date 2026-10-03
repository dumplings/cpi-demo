import { expect } from "chai";
import * as anchor from "@anchor-lang/core";

import {
  expectPaymentSnapshotUnchanged,
  fetchPaymentSnapshot,
} from "../helpers/assertions";
import {
  PAYMENT_AMOUNT,
  PaymentRequestRef,
  TestContext,
} from "../helpers/context";
import { expectAnchorError } from "../helpers/errors";
import {
  buildInspectorExecuteInstruction,
  createPendingPayment,
  sendInstruction,
} from "../helpers/transactions";

export function registerCpiSecurityTests(ctx: TestContext): void {
  describe("CPI target and privilege security", () => {
    let request: PaymentRequestRef;

    before(async () => {
      request = await createPendingPayment(ctx);
    });

    it("rejects an untrusted treasury program", async () => {
      const before = await fetchPaymentSnapshot(ctx, request);
      const instruction = await buildInspectorExecuteInstruction(ctx, request);
      let replaced = false;
      const substitutedInstruction = new anchor.web3.TransactionInstruction({
        programId: instruction.programId,
        data: instruction.data,
        keys: instruction.keys.map((meta) => {
          if (meta.pubkey.equals(ctx.executorProgram.programId)) {
            replaced = true;
            return {
              pubkey: anchor.web3.SystemProgram.programId,
              isSigner: meta.isSigner,
              isWritable: meta.isWritable,
            };
          }
          return meta;
        }),
      });
      expect(
        replaced,
        "executor Program AccountMeta should be replaced"
      ).to.equal(true);

      await expectAnchorError(
        () => sendInstruction(ctx, substitutedInstruction, [ctx.operator]),
        {
          code: "InvalidProgramId",
          origin: "transfer_executor_program",
          programId: ctx.inspectorProgram.programId,
        }
      );

      const after = await fetchPaymentSnapshot(ctx, request);
      expectPaymentSnapshotUnchanged(before, after);
    });

    it("keeps PolicyAuthority readonly across the CPI boundary", async () => {
      const inspectorInstruction = await buildInspectorExecuteInstruction(
        ctx,
        request
      );
      const executorInstruction = await ctx.executorProgram.methods
        .executePayment(new anchor.BN(PAYMENT_AMOUNT))
        .accountsStrict({
          authority: ctx.policyAuthority,
          treasuryState: ctx.treasuryState,
          treasuryVault: ctx.treasuryVault,
          recipient: request.recipient,
          systemProgram: ctx.systemProgram,
        })
        .instruction();

      const outerAuthority = inspectorInstruction.keys.find((meta) =>
        meta.pubkey.equals(ctx.policyAuthority)
      );
      const innerAuthority = executorInstruction.keys.find((meta) =>
        meta.pubkey.equals(ctx.policyAuthority)
      );

      expect(outerAuthority).not.to.be.undefined;
      expect(outerAuthority?.isSigner).to.equal(false);
      expect(outerAuthority?.isWritable).to.equal(false);
      expect(innerAuthority).not.to.be.undefined;
      expect(innerAuthority?.isSigner).to.equal(true);
      expect(innerAuthority?.isWritable).to.equal(false);
    });
  });
}
