use crate::constants::{PAYMENT_REQUEST_SEED, POLICY_CONFIG_SEED};
use crate::error::InspectError;
use crate::state::{PaymentRequest, PolicyConfig};
use crate::PaymentRequestStatus;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreatePaymentRequest<'info> {
    #[account(
        mut,
        address = policy_config.operator,
    )]
    pub requester: Signer<'info>,

    #[account(
        mut,
        seeds = [POLICY_CONFIG_SEED],
        bump = policy_config.bump,
        constraint = policy_config.operator == requester.key()
    )]
    pub policy_config: Account<'info, PolicyConfig>,

    #[account(
        init,
        payer = requester,
        space = PaymentRequest::DISCRIMINATOR.len() + PaymentRequest::INIT_SPACE,
        seeds = [
            PAYMENT_REQUEST_SEED,
            policy_config.key().as_ref(),
            policy_config.request_count.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub payment_request: Account<'info, PaymentRequest>,
    pub system_program: Program<'info, System>,
}

pub fn handle_create_payment_request(
    ctx: Context<CreatePaymentRequest>,
    recipient: Pubkey,
    amount: u64,
) -> Result<()> {
    let policy_config = &ctx.accounts.policy_config;
    let payment_request = &mut ctx.accounts.payment_request;

    require!(amount > 0, InspectError::InvalidPaymentAmount);
    require!(
        amount <= policy_config.max_payment,
        InspectError::PaymentExceedsPolicyLimit,
    );
    require!(!policy_config.paused, InspectError::PolicyPaused);

    let next_request_count = policy_config
        .request_count
        .checked_add(1)
        .ok_or(InspectError::ArithmeticOverflow)?;

    payment_request.policy = policy_config.key();
    payment_request.requester = policy_config.operator.key();
    payment_request.recipient = recipient;
    payment_request.amount = amount;
    payment_request.request_id = policy_config.request_count;
    payment_request.status = PaymentRequestStatus::Pending;
    payment_request.created_at = Clock::get()?.unix_timestamp;
    payment_request.bump = ctx.bumps.payment_request;

    let policy_config = &mut ctx.accounts.policy_config;
    policy_config.request_count = next_request_count;

    Ok(())
}
