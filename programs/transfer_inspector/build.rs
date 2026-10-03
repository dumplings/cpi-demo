fn main() {
    // declare_program! reads this file; rebuild A when B's ID or schema changes.
    println!("cargo:rerun-if-changed=../../idls/transfer_executor.json");
}
