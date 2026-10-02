use crate::constants::{INITIAL_ADMIN, POLICY_CONFIG_SEED};
use crate::state::PolicyConfig;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializePolicy<'info> {
    #[account(
        mut,
        address = INITIAL_ADMIN
    )]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = PolicyConfig::DISCRIMINATOR.len() + PolicyConfig::INIT_SPACE,
        seeds = [POLICY_CONFIG_SEED],
        bump,
    )]
    pub policy_config: Account<'info, PolicyConfig>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_policy(
    ctx: Context<InitializePolicy>,
    operator: Pubkey,
    max_payment: u64,
) -> Result<()> {
    let policy_config = &mut ctx.accounts.policy_config;

    policy_config.admin = ctx.accounts.authority.key();
    policy_config.operator = operator;
    policy_config.max_payment = max_payment;
    policy_config.total_executed = 0;
    policy_config.request_count = 0;
    policy_config.paused = false;
    policy_config.bump = ctx.bumps.policy_config;

    Ok(())
}
