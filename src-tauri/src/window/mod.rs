//! Window management module
//! Handles window state persistence and event handling

pub mod event_handler;
pub mod state_manager;

// Re-export commonly used functions
pub use event_handler::init_window_event_handler;
