pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("AReHvjWYQNZVB9PgcfcyqftKX4yJEoU54M9KTkGEBfm3");
declare_program!(transfer_executor);

#[program]
pub mod transfer_inspector {
    use super::*;

    pub fn initialize_policy(
        ctx: Context<InitializePolicy>,
        operator: Pubkey,
        max_payment: u64,
    ) -> Result<()> {
        handle_initialize_policy(ctx, operator, max_payment)
    }

    pub fn create_payment_request(
        ctx: Context<CreatePaymentRequest>,
        recipient: Pubkey,
        amount: u64,
    ) -> Result<()> {
        handle_create_payment_request(ctx, recipient, amount)
    }

    pub fn execute_payment_request(ctx: Context<ExecutePaymentRequest>) -> Result<()> {
        handle_execute_payment_request(ctx)
    }

    pub fn pause_policy(ctx: Context<PausePolicy>) -> Result<()> {
        handle_pause_policy(ctx)
    }

    pub fn resume_policy(ctx: Context<ResumePolicy>) -> Result<()> {
        handle_resume_policy(ctx)
    }
}
