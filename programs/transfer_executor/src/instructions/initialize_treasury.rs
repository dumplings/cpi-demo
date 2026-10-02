use crate::constants::{INITIAL_ADMIN, TREASURY_STATE_SEED, TREASURY_VAULT_SEED};
use crate::TreasuryState;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(
        mut,
        address = INITIAL_ADMIN,
    )]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = TreasuryState::DISCRIMINATOR.len() + TreasuryState::INIT_SPACE,
        seeds = [TREASURY_STATE_SEED],
        bump,
    )]
    pub treasury_state: Account<'info, TreasuryState>,

    /// CHECK: zero-data account owned by system-program
    #[account(
        init,
        payer = authority,
        owner = system_program::ID,
        space = 0,
        seeds = [TREASURY_VAULT_SEED],
        bump,
    )]
    pub treasury_vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_treasury(
    ctx: Context<InitializeTreasury>,
    authorized_policy_authority: Pubkey,
) -> Result<()> {
    let treasury_state = &mut ctx.accounts.treasury_state;
    treasury_state.admin = ctx.accounts.authority.key();
    treasury_state.authorized_policy_authority = authorized_policy_authority;
    treasury_state.total_paid = 0;
    treasury_state.payment_count = 0;
    treasury_state.paused = false;
    treasury_state.bump = ctx.bumps.treasury_state;

    Ok(())
}
