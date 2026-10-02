use crate::constants::POLICY_CONFIG_SEED;
use crate::error::InspectError;
use crate::state::PolicyConfig;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PausePolicy<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [POLICY_CONFIG_SEED],
        bump = policy_config.bump,
        constraint = policy_config.admin == authority.key()
    )]
    pub policy_config: Account<'info, PolicyConfig>,
}

pub fn handle_pause_policy(ctx: Context<PausePolicy>) -> Result<()> {
    let policy_config = &mut ctx.accounts.policy_config;

    require!(!policy_config.paused, InspectError::PolicyAlreadyPaused);

    policy_config.paused = true;

    Ok(())
}
