use anchor_lang::prelude::*;

#[constant]
pub const POLICY_CONFIG_SEED: &[u8] = b"policy_config";
#[constant]
pub const POLICY_AUTHORITY_SEED: &[u8] = b"policy_authority";
#[constant]
pub const PAYMENT_REQUEST_SEED: &[u8] = b"payment_request";

pub const INITIAL_ADMIN: Pubkey = pubkey!("mV8B9brE2rWGfbRWUKhqBws2PzdQLztfFWqLLZ8Rnn3");
