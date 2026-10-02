use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TreasuryState {
    pub admin: Pubkey,
    pub authorized_policy_authority: Pubkey,
    pub total_paid: u64,
    pub payment_count: u64,
    pub paused: bool,
    pub bump: u8,
}
