import {
  expectPaymentSnapshotUnchanged,
  fetchPaymentSnapshot,
} from "../helpers/assertions";
import { PaymentRequestRef, TestContext } from "../helpers/context";
import { ExpectedAnchorError, expectAnchorError } from "../helpers/errors";
import {
  createPendingPayment,
  inspectorExecuteAccounts,
  InspectorExecuteAccounts,
} from "../helpers/transactions";

export function registerAccountSecurityTests(ctx: TestContext): void {
  describe("Account and PDA substitution", () => {
    let request: PaymentRequestRef;

    before(async () => {
      request = await createPendingPayment(ctx);
    });

    async function expectSubstitutionRejected(
      overrides: Partial<InspectorExecuteAccounts>,
      expected: ExpectedAnchorError
    ): Promise<void> {
      const before = await fetchPaymentSnapshot(ctx, request);
      await expectAnchorError(
        () =>
          ctx.inspectorProgram.methods
            .executePaymentRequest()
            .accountsStrict(inspectorExecuteAccounts(ctx, request, overrides))
            .signers([ctx.operator])
            .rpc(),
        expected
      );
      const after = await fetchPaymentSnapshot(ctx, request);
      expectPaymentSnapshotUnchanged(before, after);
    }

    it("rejects a substituted policy account", async () => {
      await expectSubstitutionRejected(
        { policyConfig: ctx.attacker.publicKey },
        {
          code: "AccountOwnedByWrongProgram",
          origin: "policy_config",
          programId: ctx.inspectorProgram.programId,
        }
      );
    });

    it("rejects a substituted payment request", async () => {
      await expectSubstitutionRejected(
        { paymentRequest: ctx.policyConfig },
        {
          code: "AccountDiscriminatorMismatch",
          origin: "payment_request",
          programId: ctx.inspectorProgram.programId,
        }
      );
    });

    it("rejects a substituted treasury state", async () => {
      await expectSubstitutionRejected(
        { treasuryState: ctx.policyConfig },
        {
          code: "AccountOwnedByWrongProgram",
          origin: "treasury_state",
          programId: ctx.executorProgram.programId,
        }
      );
    });

    it("rejects a substituted PolicyAuthority", async () => {
      await expectSubstitutionRejected(
        { policyAuthority: ctx.attacker.publicKey },
        {
          code: "ConstraintSeeds",
          origin: "policy_authority",
          programId: ctx.inspectorProgram.programId,
        }
      );
    });

    it("rejects a substituted treasury vault", async () => {
      await expectSubstitutionRejected(
        { treasuryVault: ctx.operator.publicKey },
        {
          code: "ConstraintSeeds",
          origin: "treasury_vault",
          programId: ctx.executorProgram.programId,
        }
      );
    });

    it("rejects a substituted recipient", async () => {
      await expectSubstitutionRejected(
        { recipient: ctx.attacker.publicKey },
        {
          code: "ConstraintAddress",
          origin: "recipient",
          programId: ctx.inspectorProgram.programId,
        }
      );
    });
  });
}
