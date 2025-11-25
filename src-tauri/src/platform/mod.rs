//! Platform utilities module
//! Provides cross-platform functionality for interacting with Antigravity

pub mod antigravity;
pub mod process;

// Re-export commonly used types and functions
pub use antigravity::*;
pub use process::*;
