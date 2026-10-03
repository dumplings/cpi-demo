# Engineering Finish Validation Record

验证日期：2026-10-04（Asia/Shanghai）。这是工程验证记录；不宣布 TASK-02 passed，最终验收由上层/主控 Agent 决定。

本记录保留 Program ID 切换前的历史状态。后续已按 deployment keypair 将 IDs 切换为 A=`2CV…`、B=`FQEP…`；本页旧 ID 和 keypair mismatch 表不代表当前状态。当前切换诊断与验证见 [Program ID diagnosis](program-id-diagnosis.md)。

## Scope

- 新增 README 技术设计、逐用例测试矩阵与本记录。
- 澄清 A 的 signer/recipient/forwarding CHECK 注释、B 的 Vault/recipient CHECK 注释及 funding convenience 注释。
- 修正 A recipient CHECK 的全角冒号，移除因此泄漏进 IDL 的旧 `docs` 文本，并与生成 IDL 对齐。
- 无 Program ID、PDA seeds、账户布局、authority model、业务规则或测试行为变更。

## Environment

使用本机已有 Rust 1.89.0、Anchor CLI 1.1.2、Solana CLI 3.1.10、Surfpool、pnpm 11.19.0 和 Codex bundled Node runtime。

验证 shell 临时补充现有工具路径，无全局配置修改或依赖升级：

```bash
export PATH="/Users/dumplings/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/dumplings/.local/share/solana/install/releases/3.1.10/solana-release/bin:/Users/dumplings/.local/bin:$PATH"
export pnpm_config_verify_deps_before_run=warn
export npm_config_update_notifier=false
```

所有下表 CLI 命令均带 `NO_DNA=1`。pnpm 使用已有 node_modules；临时 `warn` 设置保留 dependency-status 告警并避免 pnpm 自动重装依赖。

## Results

| Requested command | Final result | Evidence / qualifications |
| --- | --- | --- |
| `cargo fmt --check` | exit 0 | Rust formatting 通过 |
| `anchor build` | exit 0，存在告警 | 两程序 SBF build 与 IDL generation 成功；见下方告警 |
| `cargo clippy --workspace --all-targets` | exit 0 | 两程序检查通过，无 Clippy 告警 |
| `anchor test` | exit 0 | 默认 Surfpool localnet；**21 passing (349ms)**，0 failing、0 pending |
| `pnpm exec tsc --noEmit` | exit 0，存在环境告警 | TypeScript 类型检查通过；pnpm dependency-status 告警保留 |
| `pnpm lint` | exit 0，存在环境告警 | 项目真实 Prettier JS/TS check 通过 |

额外检查：21 个 scenario 测试名在矩阵中各出现一次；checked-in 两份 IDL 与 build-generated IDL 的 JSON 内容相等；排除注释/空白后，三个改动 Rust 文件与 HEAD 相同；IDL 去掉文档字段后与 HEAD 相同；`git diff --check` 通过。

## Initial execution failures and recovery

- 默认 shell 的 PATH 缺少 Node 和 Solana 安装目录，Anchor version 查询尝试下载 Solana installer并失败。随后找到并使用已有 Solana 3.1.10；未安装或升级工具链。
- pnpm 默认 `verifyDepsBeforeRun=install` 检测 workspace setting 差异，尝试自动 install，遭遇 registry network / non-TTY modules purge 错误。随后使用临时 `pnpm_config_verify_deps_before_run=warn`，既有依赖完成 tsc/lint/test；未重装 node_modules、未修改 lockfile。删除该次尝试生成的临时 `.pnpm-store/v11/index.db`。
- 沙箱内 `anchor test` 因 `127.0.0.1:8899` bind 返回 `Operation not permitted` 而失败，suite 未启动。经工具审批在沙箱外重跑同一默认命令，21 个测试全部通过；没有改用 legacy validator，也没有关闭 preflight 或跳过测试。

## Remaining warnings / unresolved issues

1. 初次 `anchor build` 报告 B 的 deployment keypair 与源码 ID 不匹配。只读取公钥进一步核对，两份本地 deploy keypair 均与固定源码/Anchor.toml ID 不同：

   | Program | Source / Anchor.toml ID | Existing deploy keypair pubkey |
   | --- | --- | --- |
   | A | `AReHvjWYQNZVB9PgcfcyqftKX4yJEoU54M9KTkGEBfm3` | `2CVzr8eS28y5daWUYJfsQdG8jucoEC2V4A6mLvBUD1Nr` |
   | B | `49oGdjBxZQbSNWKReYqecthnCiEDziBLgX5wJsna2jxK` | `FQEPdYMcvsPeafF7kgDRedjYndwUEmp8J2sYYPiA8V64` |

   固定 IDs 和现有 keypairs 均保留，未运行 `anchor keys sync`。默认 localnet 测试成功不等于这两份 keypairs 可用于部署到固定地址；普通 deploy 前仍需解决对应 keypair/artifact 问题。
2. `cargo-build-sbf` 报告 `cdylib` + `lib` 阻止 LTO；同时报告若干 undefined / unknown syscalls（例如 `sol_invoke_signed_rust`、`sol_get_rent_sysvar`）。未修改 crate types 或工具链。本次默认 Surfpool 实际成功执行 nested CPI，但这些构建告警仍需记录，不能宣称所有 runtime/deployment 环境都已验证。
3. pnpm 告警：`Your node_modules are out of sync with your lockfile. The value of the workspacePackagePatterns setting has changed`。没有为本次文档工作重装依赖；通过结果基于当前 node_modules。
4. 业务与测试边界仅报告：Vault 的 owner/zero-data 条件在初始化建立，execute/fund 没有重复显式约束；recipient≠Vault 只在 A 校验；B→System 失败、overflow 和 runtime privilege escalation 等没有独立负面测试。完整边界见 [README](../README.md#known-limitations) 和 [test matrix](test-matrix.md#coverage-boundaries)。

未作 production deployment、安全审计或生产就绪声明。
