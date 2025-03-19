mod video_processor;
mod audio_processor;

use wasm_bindgen::prelude::*;
use std::panic;

#[wasm_bindgen(start)]
pub fn start() -> Result<(), JsValue> {
    // Initialize panic hook for better error messages
    panic::set_hook(Box::new(console_error_panic_hook::hook));
    
    // Log initialization
    web_sys::console::log_1(&"WASM Video Editor module initialized".into());
    
    Ok(())
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! WebAssembly Video Editor is ready.", name)
}

// Re-export the modules
pub use video_processor::VideoProcessor;
pub use audio_processor::AudioProcessor;
