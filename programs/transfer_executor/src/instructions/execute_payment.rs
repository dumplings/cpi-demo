use crate::constants::{TREASURY_STATE_SEED, TREASURY_VAULT_SEED};
use crate::error::ExecuteError;
use crate::state::TreasuryState;
use anchor_lang::prelude::*;
use anchor_lang::system_program;

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [TREASURY_STATE_SEED],
        bump,
    )]
    pub treasury_state: Account<'info, TreasuryState>,

    /// CHECK: Canonical PDA; initialization creates a System-owned, zero-data vault.
    #[account(
        mut,
        seeds = [TREASURY_VAULT_SEED],
        bump,
        owner = system_program::ID,
    )]
    pub treasury_vault: UncheckedAccount<'info>,

    /// CHECK: SOL destination; the calling policy program validates recipient identity.
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_execute_payment(ctx: Context<ExecutePayment>, amount: u64) -> Result<()> {
    let treasury_state = &ctx.accounts.treasury_state;
    require_keys_eq!(
        ctx.accounts.authority.key(),
        treasury_state.authorized_policy_authority,
        ExecuteError::UnauthorizedPolicyAuthority,
    );
    require!(!treasury_state.paused, ExecuteError::TreasuryPaused);
    require!(amount > 0, ExecuteError::InvalidPaymentAmount);

    let treasury_vault = &mut ctx.accounts.treasury_vault;
    let rent = Rent::get()?;
    let minimum_balance = rent.minimum_balance(treasury_vault.data_len());
    let transferable_balance = treasury_vault
        .lamports()
        .checked_sub(minimum_balance)
        .ok_or(ExecuteError::InsufficientTreasuryFunds)?;
    require!(
        transferable_balance >= amount,
        ExecuteError::InsufficientTreasuryFunds
    );

    let cpi_accounts = system_program::Transfer {
        from: ctx.accounts.treasury_vault.to_account_info(),
        to: ctx.accounts.recipient.to_account_info(),
    };
    let signer_seeds: &[&[&[u8]]] = &[&[TREASURY_VAULT_SEED, &[ctx.bumps.treasury_vault]]];
    let cpi_context = CpiContext::new_with_signer(system_program::ID, cpi_accounts, signer_seeds);
    system_program::transfer(cpi_context, amount)?;

    let treasury_state = &mut ctx.accounts.treasury_state;
    treasury_state.total_paid = treasury_state
        .total_paid
        .checked_add(amount)
        .ok_or(ExecuteError::ArithmeticOverflow)?;
    treasury_state.payment_count = treasury_state
        .payment_count
        .checked_add(1)
        .ok_or(ExecuteError::ArithmeticOverflow)?;

    Ok(())
}
