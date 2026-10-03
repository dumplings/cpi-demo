use crate::constants::{PAYMENT_REQUEST_SEED, POLICY_AUTHORITY_SEED, POLICY_CONFIG_SEED};
use crate::error::InspectError;
use crate::state::{PaymentRequest, PaymentRequestStatus, PolicyConfig};
use crate::transfer_executor::{
    cpi::{self, accounts::ExecutePayment},
    program::TransferExecutor,
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ExecutePaymentRequest<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [POLICY_CONFIG_SEED],
        bump = policy_config.bump,
        constraint = policy_config.operator == authority.key()
    )]
    pub policy_config: Account<'info, PolicyConfig>,

    #[account(
        mut,
        seeds = [
            PAYMENT_REQUEST_SEED,
            policy_config.key().as_ref(),
            payment_request.request_id.to_le_bytes().as_ref(),
        ],
        bump = payment_request.bump,
        constraint = payment_request.requester == authority.key(),
        constraint = payment_request.policy == policy_config.key(),
    )]
    pub payment_request: Account<'info, PaymentRequest>,

    /// CHECK: 触发 Program B 的 authority 身份
    #[account(
        seeds = [POLICY_AUTHORITY_SEED],
        bump,
    )]
    pub policy_authority: UncheckedAccount<'info>,

    /// CHECK：收账的
    #[account(
        mut,
        address = payment_request.recipient,
        constraint = recipient.key() != treasury_vault.key(),
    )]
    pub recipient: UncheckedAccount<'info>,

    /// CHECK: A 只负责 forward
    #[account(mut)]
    pub treasury_state: UncheckedAccount<'info>,
    /// CHECK: A 只负责 forward
    #[account(mut)]
    pub treasury_vault: UncheckedAccount<'info>,
    pub transfer_executor_program: Program<'info, TransferExecutor>,
    pub system_program: Program<'info, System>,
}

pub fn handle_execute_payment_request(ctx: Context<ExecutePaymentRequest>) -> Result<()> {
    let policy_config = &ctx.accounts.policy_config;
    let payment_request = &ctx.accounts.payment_request;

    require!(!policy_config.paused, InspectError::PolicyPaused);
    require!(
        payment_request.status == PaymentRequestStatus::Pending,
        InspectError::InvalidPaymentRequestStatus,
    );
    require!(
        payment_request.amount <= policy_config.max_payment,
        InspectError::PaymentExceedsPolicyLimit,
    );

    let cpi_accounts = ExecutePayment {
        authority: ctx.accounts.policy_authority.to_account_info(),
        treasury_state: ctx.accounts.treasury_state.to_account_info(),
        treasury_vault: ctx.accounts.treasury_vault.to_account_info(),
        recipient: ctx.accounts.recipient.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    let signer_seeds: &[&[&[u8]]] = &[&[POLICY_AUTHORITY_SEED, &[ctx.bumps.policy_authority]]];

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.transfer_executor_program.key(),
        cpi_accounts,
        signer_seeds,
    );
    cpi::execute_payment(cpi_context, payment_request.amount)?;

    let policy_config = &mut ctx.accounts.policy_config;
    let payment_request = &mut ctx.accounts.payment_request;
    payment_request.status = PaymentRequestStatus::Executed;
    policy_config.total_executed = policy_config
        .total_executed
        .checked_add(payment_request.amount)
        .ok_or(InspectError::ArithmeticOverflow)?;

    Ok(())
}
