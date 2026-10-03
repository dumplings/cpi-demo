import * as anchor from "@anchor-lang/core";

import {
  expectPaymentSnapshotUnchanged,
  fetchPaymentSnapshot,
} from "../helpers/assertions";
import { PAYMENT_AMOUNT, TestContext } from "../helpers/context";
import { expectAnchorError } from "../helpers/errors";
import {
  createPendingPayment,
  inspectorExecuteAccounts,
  sendInstruction,
} from "../helpers/transactions";

export function registerAuthorizationSecurityTests(ctx: TestContext): void {
  describe("Authority and signer security", () => {
    it("rejects payment execution by an unauthorized authority", async () => {
      const request = await createPendingPayment(ctx);
      const before = await fetchPaymentSnapshot(ctx, request);

      await expectAnchorError(
        () =>
          ctx.inspectorProgram.methods
            .executePaymentRequest()
            .accountsStrict(
              inspectorExecuteAccounts(ctx, request, {
                authority: ctx.attacker.publicKey,
              })
            )
            .signers([ctx.attacker])
            .rpc(),
        {
          code: "ConstraintRaw",
          origin: "policy_config",
          programId: ctx.inspectorProgram.programId,
        }
      );

      const after = await fetchPaymentSnapshot(ctx, request);
      expectPaymentSnapshotUnchanged(before, after);
    });

    it("rejects a direct executor call without the PolicyAuthority PDA signer", async () => {
      const request = await createPendingPayment(ctx);
      const before = await fetchPaymentSnapshot(ctx, request);
      const instruction = await ctx.executorProgram.methods
        .executePayment(new anchor.BN(PAYMENT_AMOUNT))
        .accountsStrict({
          authority: ctx.policyAuthority,
          treasuryState: ctx.treasuryState,
          treasuryVault: ctx.treasuryVault,
          recipient: request.recipient,
          systemProgram: ctx.systemProgram,
        })
        .instruction();

      const unsignedAuthorityInstruction =
        new anchor.web3.TransactionInstruction({
          programId: instruction.programId,
          data: instruction.data,
          keys: instruction.keys.map((meta) =>
            meta.pubkey.equals(ctx.policyAuthority)
              ? { ...meta, isSigner: false }
              : meta
          ),
        });

      await expectAnchorError(
        () => sendInstruction(ctx, unsignedAuthorityInstruction),
        {
          code: "AccountNotSigner",
          origin: "authority",
          programId: ctx.executorProgram.programId,
        }
      );

      const after = await fetchPaymentSnapshot(ctx, request);
      expectPaymentSnapshotUnchanged(before, after);
    });
  });
}
