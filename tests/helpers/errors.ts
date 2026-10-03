import { expect } from "chai";
import * as anchor from "@anchor-lang/core";

export interface ExpectedAnchorError {
  code: string;
  message?: string;
  origin?: string;
  programId: anchor.web3.PublicKey;
}

function errorDetails(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

export async function expectAnchorError(
  action: () => Promise<unknown>,
  expected: ExpectedAnchorError
): Promise<anchor.AnchorError> {
  let thrown: unknown;
  try {
    await action();
  } catch (error) {
    thrown = error;
  }

  expect(thrown, "transaction should fail").not.to.be.undefined;

  const logs = (thrown as { logs?: string[] } | undefined)?.logs;
  const parsed =
    thrown instanceof anchor.AnchorError
      ? thrown
      : logs
      ? anchor.AnchorError.parse(logs)
      : null;

  expect(parsed, `expected an Anchor error, received ${errorDetails(thrown)}`)
    .not.to.be.null;
  if (!parsed) {
    throw new Error(`Unable to parse Anchor error: ${errorDetails(thrown)}`);
  }

  expect(parsed.error.errorCode.code).to.equal(expected.code);
  if (expected.message) {
    expect(parsed.error.errorMessage).to.equal(expected.message);
  }
  if (expected.origin) {
    expect(parsed.error.origin).to.equal(expected.origin);
  }
  expect(parsed.program?.equals(expected.programId)).to.equal(
    true,
    `error should originate from ${expected.programId.toBase58()}`
  );

  return parsed;
}
