use anchor_lang::prelude::*;

#[derive(InitSpace, Copy, Clone, PartialEq, AnchorDeserialize, AnchorSerialize)]
pub enum PaymentRequestStatus {
    Pending,
    Executed,
}

#[account]
#[derive(InitSpace)]
pub struct PolicyConfig {
    pub admin: Pubkey,
    pub operator: Pubkey,
    pub max_payment: u64,
    pub total_executed: u64,
    pub request_count: u64,
    pub paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct PaymentRequest {
    pub policy: Pubkey,
    pub requester: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub request_id: u64,
    pub status: PaymentRequestStatus,
    pub created_at: i64,
    pub bump: u8,
}
