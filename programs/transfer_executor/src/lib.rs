pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("49oGdjBxZQbSNWKReYqecthnCiEDziBLgX5wJsna2jxK");

#[program]
pub mod transfer_executor {
    use super::*;

    pub fn initialize_treasury(
        ctx: Context<InitializeTreasury>,
        authorized_policy_authority: Pubkey,
    ) -> Result<()> {
        handle_initialize_treasury(ctx, authorized_policy_authority)
    }

    pub fn fund_treasury(ctx: Context<FundTreasury>, amount: u64) -> Result<()> {
        handle_fund_treasury(ctx, amount)
    }

    pub fn execute_payment(ctx: Context<ExecutePayment>, amount: u64) -> Result<()> {
        handle_execute_payment(ctx, amount)
    }

    pub fn pause_treasury(ctx: Context<PauseTreasury>) -> Result<()> {
        handle_pause_treasury(ctx)
    }

    pub fn resume_treasury(ctx: Context<ResumeTreasury>) -> Result<()> {
        handle_resume_treasury(ctx)
    }
}
