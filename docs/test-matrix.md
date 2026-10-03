# Security / Negative Test Matrix

本表以 `tests/cpi-demo.ts` 注册的 8 组 scenarios 为范围，逐项对应当前 21 个 `it(...)`。测试名使用源码原文，层次 A/B 指错误日志里的 originating Program。`tests/helpers/errors.ts` 检查 Anchor error code、指定时的 message/origin 和 program ID，不只是检查 promise rejected。

架构、账户与 signer 机制见 [README](../README.md)。这是测试代码的覆盖说明，不替代一次真实运行的结果或主控验收。

## Snapshot / assertions

下表的 **S 不变** 精确指 `fetchPaymentSnapshot` + `expectPaymentSnapshotUnchanged` 比较的六项：

1. PaymentRequest status。
2. PolicyConfig `total_executed`。
3. TreasuryState `total_paid`。
4. TreasuryState `payment_count`。
5. committed recipient SOL balance。
6. canonical TreasuryVault SOL balance。

S 不包含 operator/admin fee payer balance、`request_count`、全部 account bytes 或替换目标的 balance。错误通常通过 `.rpc()` / `sendAndConfirm()` 的 preflight simulation 返回，suite 没有强制发送失败 transaction。

## Initialization — [initialization.ts](../tests/scenarios/initialization.ts)

| Scenario（真实测试名） | Attack / invalid input | Expected rejection layer / result | Invariant protected | Post-failure state checked / success assertions |
| --- | --- | --- | --- | --- |
| initializes the inspector policy | 正常 admin 初始化 | A 成功 | policy 初始化正确 | 检查 admin/operator/max、两个初始 counter、paused=false、canonical bump；无失败分支断言 |
| initializes the executor treasury | 配置 A PolicyAuthority，正常初始化 | B 成功 | treasury 初始配置与 Vault owner/data | 检查 admin/configured authority、金额/次数为 0、paused=false、bump；Vault System-owned 且 data length=0 |
| funds the treasury vault | 正常 fund 4,000,000 lamports | B→System 成功 | 注资确实到账 | 成功检查 Vault 增量；若调用抛错，先检查 Vault balance 不变，再重新抛错 |

该组 `after` hook 在 funding 测试失败时可直接 System transfer 补足后续场景的余额；原 funding failure 仍会被报告，不能把后续成功视为 funding 用例通过。

## Payment request — [payment-request.ts](../tests/scenarios/payment-request.ts)

| Scenario（真实测试名） | Attack / invalid input | Expected rejection layer / result | Invariant protected | Post-failure state checked / success assertions |
| --- | --- | --- | --- | --- |
| rejects payment request creation by an unauthorized requester | attacker 作为 requester 并签名 | A account constraint：`ConstraintAddress`，`requester` | 只有 configured operator 创建 | `request_count` 不变，拟创建 request account 不存在 |
| rejects a payment above the policy limit | configured operator 请求 `MAX_PAYMENT + 1` | A handler：`PaymentExceedsPolicyLimit` | amount≤policy max | `request_count` 不变，拟创建 request account 不存在 |
| creates a pending payment request | 正常 operator 创建 | A 成功 | request commitment 和 next-id counter | 检查 policy/requester/recipient/amount/request_id/Pending；counter 增一；此 request 留给 happy path |

## Authority and signer security — [authorization-security.ts](../tests/scenarios/authorization-security.ts)

| Scenario（真实测试名） | Attack / invalid input | Expected rejection layer | Invariant protected | Post-failure state checked |
| --- | --- | --- | --- | --- |
| rejects payment execution by an unauthorized authority | attacker 替换 operator 并签名 | A constraint：`ConstraintRaw`，`policy_config` | 只有 configured operator 执行 | S 不变 |
| rejects a direct executor call without the PolicyAuthority PDA signer | 直接调用 B，传正确 PDA key，但把 authority meta 的 `isSigner` 设为 false | B `Signer`：`AccountNotSigner`，`authority` | 知道地址不等于 signer privilege | S 不变；该 request 只是 snapshot 基准，不传给 B |

直接 B 用例未伪造 PDA 的 transaction signature，也没有测试“另一个有效 wallet signer 但 configured key 不匹配”对应的 `UnauthorizedPolicyAuthority` 分支。

## Account and PDA substitution — [account-security.ts](../tests/scenarios/account-security.ts)

这些用例通过共享 helper 每次取 S，再替换一个 account；真实 canonical request 保持 Pending。

| Scenario（真实测试名） | Attack / invalid input | Expected rejection layer | Invariant protected | Post-failure state checked |
| --- | --- | --- | --- | --- |
| rejects a substituted policy account | `policyConfig = attacker`（System-owned wallet） | A deserialize：`AccountOwnedByWrongProgram`，`policy_config` | policy 必须为 A-owned 类型；canonical policy 另由源码 seeds 保证 | S 不变 |
| rejects a substituted payment request | `paymentRequest = canonical PolicyConfig`（A-owned 错误类型） | A deserialize：`AccountDiscriminatorMismatch`，`payment_request` | request 类型身份 | S 不变 |
| rejects a substituted treasury state | `treasuryState = canonical PolicyConfig`（A-owned） | B deserialize：`AccountOwnedByWrongProgram`，`treasury_state` | B 校验 treasury state owner/type | S 不变 |
| rejects a substituted PolicyAuthority | `policyAuthority = attacker` | A constraint：`ConstraintSeeds`，`policy_authority` | canonical A authority PDA | S 不变 |
| rejects a substituted treasury vault | `treasuryVault = operator wallet` | B constraint：`ConstraintSeeds`，`treasury_vault` | canonical B Vault PDA | S 不变 |
| rejects a substituted recipient | `recipient = attacker`，与 request commitment 不符 | A constraint：`ConstraintAddress`，`recipient` | 固定收款地址 | S 不变；没有读取 attacker 的失败前后余额 |

wrong policy / request / treasury 用例分别在 owner / discriminator / owner 处失败，未构造“owner/type 合法但 seeds 或 policy relationship 错误”的状态账户。wrong PolicyAuthority 用例在 A 被拒绝，未进入 B 的 configured-key 校验。

## Lifecycle security — [lifecycle-security.ts](../tests/scenarios/lifecycle-security.ts)

| Scenario（真实测试名） | Attack / invalid input | Expected rejection layer | Invariant protected | Post-failure state checked |
| --- | --- | --- | --- | --- |
| rejects payment while the policy is paused and restores the lifecycle | admin pause A 后执行 Pending request | A handler：`PolicyPaused` | policy pause 阻断执行 | paused=true、S 不变；finally resume，最后 paused=false |
| rejects payment while the treasury is paused and restores the lifecycle | admin pause B 后执行 Pending request | B handler：`TreasuryPaused` | treasury pause 阻断执行 | paused=true、S 不变；finally resume，最后 paused=false |

这里验证成功 pause/resume 与暂停时执行失败，没有单独测试 unauthorized pause/resume、重复 pause/resume 或暂停时创建 request。

## CPI target and privilege security — [cpi-security.ts](../tests/scenarios/cpi-security.ts)

| Scenario（真实测试名） | Attack / invalid input | Expected rejection layer / result | Invariant protected | Post-failure state checked / evidence |
| --- | --- | --- | --- | --- |
| rejects an untrusted treasury program | 将 B Program meta 替换为另一个 executable：System Program；instruction data 和其余 metas 保留 | A typed Program：`InvalidProgramId`，`transfer_executor_program` | trusted callee identity | 先确认 B meta 被替换；S 不变 |
| keeps PolicyAuthority readonly across the CPI boundary | 无恶意调用；分别构造 A/B client instructions | 静态 meta 断言，无 runtime rejection | 最小 writable privilege；B schema 需要 signer | A meta non-signer/readonly，B meta signer/readonly；不发送 instruction，无失败后 state check |

fake Program 用例没有部署恶意程序；它证明 fixed-ID 校验会拒绝另一个 executable。meta 用例不直接观测生成的 on-chain CPI metas，不覆盖 writable/signer escalation 失败。

## Payment execution — [payment-execution.ts](../tests/scenarios/payment-execution.ts)

| Scenario（真实测试名） | Attack / invalid input | Expected rejection layer / result | Invariant protected | Post-failure state checked / success assertions |
| --- | --- | --- | --- | --- |
| executes a payment through the nested CPI chain | 正常执行先前创建的 request | A→B→System 成功 | 两级 PDA signer、account forwarding、SOL payment、双方 accounting | Pending→Executed；recipient +amount、Vault −amount；A `total_executed` / B `total_paid` +amount、B count +1；若抛错先断言 S 不变再抛错 |
| rejects replay of an executed payment request | 重复执行同一 Executed request | A handler：`InvalidPaymentRequestStatus` | at most once | S 不变；若 happy path 未产生 Executed，测试会 skip |

## CPI rollback — [rollback.ts](../tests/scenarios/rollback.ts)

| Scenario（真实测试名） | Attack / invalid input | Expected rejection layer | Invariant protected | Post-failure state checked |
| --- | --- | --- | --- | --- |
| rolls back the payment when the treasury has insufficient funds | 创建合法 max 金额 request；先证明 amount 大于 Vault 扣 rent 后余额 | B handler 余额预检：`InsufficientTreasuryFunds` | A→B 失败不提交成功状态/accounting | status 仍 Pending，S 不变 |

此错误发生在 B→System CPI **之前**，而且 A 状态写入也在 B CPI 成功之后。它不覆盖下游 System transfer 抛错、A 预先写入后回滚、转账后 accounting overflow 等分支。

## Coverage boundaries

以下有源码约束或机制说明，但当前没有独立用例；不能从本矩阵推导出覆盖声明：

- 零金额（A/B/fund）、执行时 max 再检查、checked arithmetic overflow。
- owner/type 合法但非 canonical 的 PolicyConfig/PaymentRequest/TreasuryState；request 的 policy/requester relationship 损坏。
- B 收到有效 signer 但 key 与 configured authority 不同。
- Vault owner/data 被改动后的支付拒绝；recipient=Vault；非 wallet recipient。
- 缺失/替换 System Program 的负面调用；runtime writable/signer privilege escalation。
- B→System transfer 失败后的 transaction rollback；强制提交失败 transaction 的费用与完整账户字节检查。
- 未授权初始化/管理、重复初始化、重复 pause/resume、paused creation、request ID 多次递增后单独执行旧 request 的专项用例。

本次 Engineering Finish 不增加这些业务用例、不改变约束，只记录真实覆盖与剩余边界。
