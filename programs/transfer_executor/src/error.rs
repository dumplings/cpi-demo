use anchor_lang::prelude::*;

#[error_code]
pub enum ExecuteError {
    #[msg("Payment amount must be greater than zero")]
    InvalidPaymentAmount,
    #[msg("Unauthorized policy authority")]
    UnauthorizedPolicyAuthority,
    #[msg("Treasury is paused")]
    TreasuryPaused,
    #[msg("Treasury is already paused")]
    TreasuryAlreadyPaused,
    #[msg("Treasury is not paused")]
    TreasuryNotPaused,
    #[msg("Insufficient treasury funds")]
    InsufficientTreasuryFunds,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
