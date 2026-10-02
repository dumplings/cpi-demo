use anchor_lang::prelude::*;

#[constant]
pub const TREASURY_STATE_SEED: &[u8] = b"treasury_state";
#[constant]
pub const TREASURY_VAULT_SEED: &[u8] = b"treasury_vault";

pub const INITIAL_ADMIN: Pubkey = pubkey!("mV8B9brE2rWGfbRWUKhqBws2PzdQLztfFWqLLZ8Rnn3");
