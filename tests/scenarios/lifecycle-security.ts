import { expect } from "chai";

import {
  expectPaymentSnapshotUnchanged,
  fetchPaymentSnapshot,
} from "../helpers/assertions";
import { TestContext } from "../helpers/context";
import { expectAnchorError } from "../helpers/errors";
import {
  createPendingPayment,
  executePendingPayment,
} from "../helpers/transactions";

export function registerLifecycleSecurityTests(ctx: TestContext): void {
  describe("Lifecycle security", () => {
    it("rejects payment while the policy is paused and restores the lifecycle", async () => {
      const request = await createPendingPayment(ctx);
      await ctx.inspectorProgram.methods
        .pausePolicy()
        .accountsStrict({
          authority: ctx.admin,
          policyConfig: ctx.policyConfig,
        })
        .rpc();

      try {
        const paused = await ctx.inspectorProgram.account.policyConfig.fetch(
          ctx.policyConfig
        );
        expect(paused.paused).to.equal(true);
        const before = await fetchPaymentSnapshot(ctx, request);

        await expectAnchorError(() => executePendingPayment(ctx, request), {
          code: "PolicyPaused",
          message: "Policy is paused",
          programId: ctx.inspectorProgram.programId,
        });

        const after = await fetchPaymentSnapshot(ctx, request);
        expectPaymentSnapshotUnchanged(before, after);
      } finally {
        await ctx.inspectorProgram.methods
          .resumePolicy()
          .accountsStrict({
            authority: ctx.admin,
            policyConfig: ctx.policyConfig,
          })
          .rpc();
      }

      const resumed = await ctx.inspectorProgram.account.policyConfig.fetch(
        ctx.policyConfig
      );
      expect(resumed.paused).to.equal(false);
    });

    it("rejects payment while the treasury is paused and restores the lifecycle", async () => {
      const request = await createPendingPayment(ctx);
      await ctx.executorProgram.methods
        .pauseTreasury()
        .accountsStrict({
          authority: ctx.admin,
          treasuryState: ctx.treasuryState,
        })
        .rpc();

      try {
        const paused = await ctx.executorProgram.account.treasuryState.fetch(
          ctx.treasuryState
        );
        expect(paused.paused).to.equal(true);
        const before = await fetchPaymentSnapshot(ctx, request);

        await expectAnchorError(() => executePendingPayment(ctx, request), {
          code: "TreasuryPaused",
          message: "Treasury is paused",
          programId: ctx.executorProgram.programId,
        });

        const after = await fetchPaymentSnapshot(ctx, request);
        expectPaymentSnapshotUnchanged(before, after);
      } finally {
        await ctx.executorProgram.methods
          .resumeTreasury()
          .accountsStrict({
            authority: ctx.admin,
            treasuryState: ctx.treasuryState,
          })
          .rpc();
      }

      const resumed = await ctx.executorProgram.account.treasuryState.fetch(
        ctx.treasuryState
      );
      expect(resumed.paused).to.equal(false);
    });
  });
}
