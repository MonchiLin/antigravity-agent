#![allow(dead_code)]

pub mod state_sync {
    include!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/src/proto_gen/state_sync.rs"
    ));
}
