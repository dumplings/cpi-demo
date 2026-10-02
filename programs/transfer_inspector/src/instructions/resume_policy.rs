use crate::constants::POLICY_CONFIG_SEED;
use crate::error::InspectError;
use crate::state::PolicyConfig;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ResumePolicy<'info> {
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

pub fn handle_resume_policy(ctx: Context<ResumePolicy>) -> Result<()> {
    let policy_config = &mut ctx.accounts.policy_config;

    require!(policy_config.paused, InspectError::PolicyNotPaused);

    policy_config.paused = false;

    Ok(())
}
