use crate::constants::TREASURY_STATE_SEED;
use crate::error::ExecuteError;
use crate::state::TreasuryState;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PauseTreasury<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [TREASURY_STATE_SEED],
        bump = treasury_state.bump,
        constraint = treasury_state.admin == authority.key(),
    )]
    pub treasury_state: Account<'info, TreasuryState>,
}

pub fn handle_pause_treasury(ctx: Context<PauseTreasury>) -> Result<()> {
    let treasury_state = &mut ctx.accounts.treasury_state;

    require!(!treasury_state.paused, ExecuteError::TreasuryAlreadyPaused);

    treasury_state.paused = true;

    Ok(())
}
