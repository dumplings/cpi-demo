import * as anchor from "@anchor-lang/core";

import { PaymentRequestRef, TestContext } from "./context";
import { derivePaymentRequestPda } from "./pdas";

export interface InspectorExecuteAccounts {
  authority: anchor.web3.PublicKey;
  policyConfig: anchor.web3.PublicKey;
  paymentRequest: anchor.web3.PublicKey;
  policyAuthority: anchor.web3.PublicKey;
  recipient: anchor.web3.PublicKey;
  treasuryState: anchor.web3.PublicKey;
  treasuryVault: anchor.web3.PublicKey;
  transferExecutorProgram: anchor.web3.PublicKey;
  systemProgram: anchor.web3.PublicKey;
}

export async function createPendingPayment(
  ctx: TestContext,
  recipient = ctx.receiver.publicKey,
  amount = new anchor.BN(1_000_000)
): Promise<PaymentRequestRef> {
  const policy = await ctx.inspectorProgram.account.policyConfig.fetch(
    ctx.policyConfig
  );
  const id = policy.requestCount;
  const [address] = derivePaymentRequestPda(
    ctx.inspectorProgram.programId,
    ctx.policyConfig,
    id
  );

  await ctx.inspectorProgram.methods
    .createPaymentRequest(recipient, amount)
    .accountsStrict({
      requester: ctx.operator.publicKey,
      policyConfig: ctx.policyConfig,
      paymentRequest: address,
      systemProgram: ctx.systemProgram,
    })
    .signers([ctx.operator])
    .rpc();

  return { address, amount, id, recipient };
}

export function inspectorExecuteAccounts(
  ctx: TestContext,
  request: PaymentRequestRef,
  overrides: Partial<InspectorExecuteAccounts> = {}
): InspectorExecuteAccounts {
  return {
    authority: ctx.operator.publicKey,
    policyConfig: ctx.policyConfig,
    paymentRequest: request.address,
    policyAuthority: ctx.policyAuthority,
    recipient: request.recipient,
    treasuryState: ctx.treasuryState,
    treasuryVault: ctx.treasuryVault,
    transferExecutorProgram: ctx.executorProgram.programId,
    systemProgram: ctx.systemProgram,
    ...overrides,
  };
}

export async function executePendingPayment(
  ctx: TestContext,
  request: PaymentRequestRef
): Promise<string> {
  return ctx.inspectorProgram.methods
    .executePaymentRequest()
    .accountsStrict(inspectorExecuteAccounts(ctx, request))
    .signers([ctx.operator])
    .rpc();
}

export async function buildInspectorExecuteInstruction(
  ctx: TestContext,
  request: PaymentRequestRef,
  overrides: Partial<InspectorExecuteAccounts> = {}
): Promise<anchor.web3.TransactionInstruction> {
  return ctx.inspectorProgram.methods
    .executePaymentRequest()
    .accountsStrict(inspectorExecuteAccounts(ctx, request, overrides))
    .instruction();
}

export async function sendInstruction(
  ctx: TestContext,
  instruction: anchor.web3.TransactionInstruction,
  signers: anchor.web3.Signer[] = []
): Promise<string> {
  return ctx.provider.sendAndConfirm(
    new anchor.web3.Transaction().add(instruction),
    signers
  );
}
