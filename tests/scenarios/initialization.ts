import { expect } from "chai";
import * as anchor from "@anchor-lang/core";

import { expectBn, expectPublicKey } from "../helpers/assertions";
import { FUND_AMOUNT, MAX_PAYMENT, TestContext } from "../helpers/context";

export function registerInitializationTests(ctx: TestContext): void {
  describe("Initialization", () => {
    let initialVaultBalance: number | undefined;

    after(async () => {
      if (initialVaultBalance === undefined) {
        return;
      }

      const currentBalance = await ctx.provider.connection.getBalance(
        ctx.treasuryVault
      );
      const requiredBalance = initialVaultBalance + FUND_AMOUNT;
      if (currentBalance >= requiredBalance) {
        return;
      }

      // Keep later CPI tests isolated when the Program-level funding test fails.
      const fundFallback = anchor.web3.SystemProgram.transfer({
        fromPubkey: ctx.admin,
        toPubkey: ctx.treasuryVault,
        lamports: requiredBalance - currentBalance,
      });
      await ctx.provider.sendAndConfirm(
        new anchor.web3.Transaction().add(fundFallback),
        []
      );
    });

    it("initializes the inspector policy", async () => {
      await ctx.inspectorProgram.methods
        .initializePolicy(ctx.operator.publicKey, new anchor.BN(MAX_PAYMENT))
        .accountsStrict({
          authority: ctx.admin,
          policyConfig: ctx.policyConfig,
          systemProgram: ctx.systemProgram,
        })
        .rpc();

      const policy = await ctx.inspectorProgram.account.policyConfig.fetch(
        ctx.policyConfig
      );
      expectPublicKey(policy.admin, ctx.admin, "policy admin");
      expectPublicKey(
        policy.operator,
        ctx.operator.publicKey,
        "policy operator"
      );
      expectBn(policy.maxPayment, MAX_PAYMENT, "max_payment");
      expectBn(policy.totalExecuted, 0, "initial total_executed");
      expectBn(policy.requestCount, 0, "initial request_count");
      expect(policy.paused).to.equal(false);
      expect(policy.bump).to.equal(ctx.policyConfigBump);
    });

    it("initializes the executor treasury", async () => {
      await ctx.executorProgram.methods
        .initializeTreasury(ctx.policyAuthority)
        .accountsStrict({
          authority: ctx.admin,
          treasuryState: ctx.treasuryState,
          treasuryVault: ctx.treasuryVault,
          systemProgram: ctx.systemProgram,
        })
        .rpc();

      const [treasury, vault] = await Promise.all([
        ctx.executorProgram.account.treasuryState.fetch(ctx.treasuryState),
        ctx.provider.connection.getAccountInfo(ctx.treasuryVault),
      ]);

      expectPublicKey(treasury.admin, ctx.admin, "treasury admin");
      expectPublicKey(
        treasury.authorizedPolicyAuthority,
        ctx.policyAuthority,
        "authorized policy authority"
      );
      expectBn(treasury.totalPaid, 0, "initial total_paid");
      expectBn(treasury.paymentCount, 0, "initial payment_count");
      expect(treasury.paused).to.equal(false);
      expect(treasury.bump).to.equal(ctx.treasuryStateBump);
      expect(vault).not.to.be.null;
      expect(vault?.owner.equals(anchor.web3.SystemProgram.programId)).to.equal(
        true
      );
      expect(vault?.data.length).to.equal(0);
      initialVaultBalance = vault?.lamports;
    });

    it("funds the treasury vault", async () => {
      const before = await ctx.provider.connection.getBalance(
        ctx.treasuryVault
      );
      let fundingError: unknown;

      try {
        await ctx.executorProgram.methods
          .fundTreasury(new anchor.BN(FUND_AMOUNT))
          .accountsStrict({
            authority: ctx.admin,
            treasuryVault: ctx.treasuryVault,
            systemProgram: ctx.systemProgram,
          })
          .rpc();
      } catch (error) {
        fundingError = error;
      }

      const after = await ctx.provider.connection.getBalance(ctx.treasuryVault);
      if (fundingError) {
        expect(after, "failed funding must not change the vault").to.equal(
          before
        );
        throw fundingError;
      }
      expect(after - before).to.equal(FUND_AMOUNT);
    });
  });
}
