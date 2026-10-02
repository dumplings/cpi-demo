use anchor_lang::prelude::*;

#[error_code]
pub enum InspectError {
    #[msg("Payment amount exceeds policy limit")]
    PaymentExceedsPolicyLimit,
    #[msg("Policy is paused")]
    PolicyPaused,
    #[msg("Policy is already paused")]
    PolicyAlreadyPaused,
    #[msg("Policy is not paused")]
    PolicyNotPaused,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Payment request is not pending")]
    InvalidPaymentRequestStatus,
    #[msg("Payment amount must be greater than zero")]
    InvalidPaymentAmount,
}
