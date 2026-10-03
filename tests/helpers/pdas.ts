import * as anchor from "@anchor-lang/core";

export const POLICY_CONFIG_SEED = Buffer.from("policy_config");
export const POLICY_AUTHORITY_SEED = Buffer.from("policy_authority");
export const PAYMENT_REQUEST_SEED = Buffer.from("payment_request");
export const TREASURY_STATE_SEED = Buffer.from("treasury_state");
export const TREASURY_VAULT_SEED = Buffer.from("treasury_vault");

export function derivePaymentRequestPda(
  inspectorProgramId: anchor.web3.PublicKey,
  policyConfig: anchor.web3.PublicKey,
  requestId: anchor.BN
): [anchor.web3.PublicKey, number] {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [
      PAYMENT_REQUEST_SEED,
      policyConfig.toBuffer(),
      requestId.toArrayLike(Buffer, "le", 8),
    ],
    inspectorProgramId
  );
}
