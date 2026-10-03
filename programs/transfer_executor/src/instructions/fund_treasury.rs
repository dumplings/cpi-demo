use crate::constants::TREASURY_VAULT_SEED;
use crate::error::ExecuteError;
use anchor_lang::prelude::*;
use anchor_lang::system_program;

#[derive(Accounts)]
pub struct FundTreasury<'info> {
    #[account(mut)]
    authority: Signer<'info>,

    /// CHECK: 仅持有 sol
    #[account(
        mut,
        seeds = [TREASURY_VAULT_SEED],
        bump,
    )]
    pub treasury_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

/// 仅是考虑到测试时使用的转账能力
pub fn handle_fund_treasury(ctx: Context<FundTreasury>, amount: u64) -> Result<()> {
    require!(amount > 0, ExecuteError::InvalidPaymentAmount);

    let cpi_accounts = system_program::Transfer {
        from: ctx.accounts.authority.to_account_info(),
        to: ctx.accounts.treasury_vault.to_account_info(),
    };
    let cpi_context = CpiContext::new(system_program::ID, cpi_accounts);

    system_program::transfer(cpi_context, amount)?;

    Ok(())
}
