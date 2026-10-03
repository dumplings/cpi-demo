import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";

import { TransferExecutor } from "../../target/types/transfer_executor";
import { TransferInspector } from "../../target/types/transfer_inspector";
import {
  POLICY_AUTHORITY_SEED,
  POLICY_CONFIG_SEED,
  TREASURY_STATE_SEED,
  TREASURY_VAULT_SEED,
} from "./pdas";

export const MAX_PAYMENT = 5_000_000;
export const FUND_AMOUNT = 4_000_000;
export const PAYMENT_AMOUNT = 1_000_000;

export interface PaymentRequestRef {
  address: anchor.web3.PublicKey;
  amount: anchor.BN;
  id: anchor.BN;
  recipient: anchor.web3.PublicKey;
}

export interface TestContext {
  provider: anchor.AnchorProvider;
  inspectorProgram: Program<TransferInspector>;
  executorProgram: Program<TransferExecutor>;
  admin: anchor.web3.PublicKey;
  operator: anchor.web3.Keypair;
  attacker: anchor.web3.Keypair;
  receiver: anchor.web3.Keypair;
  policyConfig: anchor.web3.PublicKey;
  policyConfigBump: number;
  policyAuthority: anchor.web3.PublicKey;
  treasuryState: anchor.web3.PublicKey;
  treasuryStateBump: number;
  treasuryVault: anchor.web3.PublicKey;
  treasuryVaultBump: number;
  happyRequest?: PaymentRequestRef;
  systemProgram: anchor.web3.PublicKey;
}

export function createTestContext(): TestContext {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const inspectorProgram = anchor.workspace
    .transferInspector as Program<TransferInspector>;
  const executorProgram = anchor.workspace
    .transferExecutor as Program<TransferExecutor>;

  const [policyConfig, policyConfigBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [POLICY_CONFIG_SEED],
      inspectorProgram.programId
    );
  const [policyAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
    [POLICY_AUTHORITY_SEED],
    inspectorProgram.programId
  );
  const [treasuryState, treasuryStateBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [TREASURY_STATE_SEED],
      executorProgram.programId
    );
  const [treasuryVault, treasuryVaultBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [TREASURY_VAULT_SEED],
      executorProgram.programId
    );

  return {
    provider,
    inspectorProgram,
    executorProgram,
    admin: provider.wallet.publicKey,
    operator: anchor.web3.Keypair.generate(),
    attacker: anchor.web3.Keypair.generate(),
    receiver: anchor.web3.Keypair.generate(),
    policyConfig,
    policyConfigBump,
    policyAuthority,
    treasuryState,
    treasuryStateBump,
    treasuryVault,
    treasuryVaultBump,
    systemProgram: anchor.web3.SystemProgram.programId,
  };
}

async function airdrop(
  provider: anchor.AnchorProvider,
  recipient: anchor.web3.PublicKey,
  lamports: number
): Promise<void> {
  const signature = await provider.connection.requestAirdrop(
    recipient,
    lamports
  );
  const blockhash = await provider.connection.getLatestBlockhash();
  await provider.connection.confirmTransaction({ signature, ...blockhash });
}

export async function airdropTestParticipants(ctx: TestContext): Promise<void> {
  const testBalance = 2 * anchor.web3.LAMPORTS_PER_SOL;
  await airdrop(ctx.provider, ctx.operator.publicKey, testBalance);
  await airdrop(ctx.provider, ctx.attacker.publicKey, testBalance);
  await airdrop(ctx.provider, ctx.receiver.publicKey, testBalance);
}
