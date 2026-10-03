import { before, describe } from "mocha";

import { airdropTestParticipants, createTestContext } from "./helpers/context";
import { registerAccountSecurityTests } from "./scenarios/account-security";
import { registerAuthorizationSecurityTests } from "./scenarios/authorization-security";
import { registerCpiSecurityTests } from "./scenarios/cpi-security";
import { registerInitializationTests } from "./scenarios/initialization";
import { registerLifecycleSecurityTests } from "./scenarios/lifecycle-security";
import { registerPaymentExecutionTests } from "./scenarios/payment-execution";
import { registerPaymentRequestTests } from "./scenarios/payment-request";
import { registerRollbackTests } from "./scenarios/rollback";

describe("CPI Lab", () => {
  const ctx = createTestContext();

  before(async () => {
    await airdropTestParticipants(ctx);
  });

  registerInitializationTests(ctx);
  registerPaymentRequestTests(ctx);
  registerAuthorizationSecurityTests(ctx);
  registerAccountSecurityTests(ctx);
  registerLifecycleSecurityTests(ctx);
  registerCpiSecurityTests(ctx);
  registerPaymentExecutionTests(ctx);
  registerRollbackTests(ctx);
});
