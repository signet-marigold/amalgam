use wasm_bindgen::prelude::*;
use web_sys::{console, ImageData};
use js_sys::{Array, Uint8Array};
use serde::{Serialize, Deserialize};

#[wasm_bindgen]
pub struct VideoProcessor {
    width: u32,
    height: u32,
    frame_rate: f64,
    current_frame: u32,
}

#[derive(Serialize, Deserialize)]
pub struct VideoMetadata {
    width: u32,
    height: u32,
    duration_ms: f64,
    frame_rate: f64,
}

#[derive(Serialize, Deserialize)]
pub struct ExportConfig {
    width: u32,
    height: u32,
    frame_rate: f64,
    quality: u8, // 0-100
}

#[wasm_bindgen]
impl VideoProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32, frame_rate: f64) -> Self {
        console::log_1(&"VideoProcessor: Initializing...".into());
        
        Self {
            width,
            height,
            frame_rate,
            current_frame: 0,
        }
    }
    
    #[wasm_bindgen]
    pub fn get_dimensions(&self) -> JsValue {
        let dimensions = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&dimensions, &"width".into(), &JsValue::from(self.width));
        let _ = js_sys::Reflect::set(&dimensions, &"height".into(), &JsValue::from(self.height));
        dimensions
    }
    
    #[wasm_bindgen]
    pub fn process_frame(&mut self, image_data: ImageData) -> Result<ImageData, JsValue> {
        // Debug performance measurement
        let window = web_sys::window().expect("no global window exists");
        let performance = window.performance().expect("performance should be available");
        let start_time = performance.now();
        
        // Get dimensions and pixel data
        let width = image_data.width();
        let height = image_data.height();
        let mut data = image_data.data().0;
        
        // Apply a simple processing effect (e.g., grayscale)
        // This is just an example - real implementation would do more advanced processing
        for i in (0..data.len()).step_by(4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            // Simple grayscale conversion
            let gray = (0.299 * r as f64 + 0.587 * g as f64 + 0.114 * b as f64) as u8;
            
            data[i] = gray;     // R
            data[i + 1] = gray; // G
            data[i + 2] = gray; // B
            // Keep Alpha channel (i + 3) as is
        }
        
        // Create a new ImageData to return
        let processed_data = Uint8Array::new_with_length(data.len() as u32);
        processed_data.copy_from(&data);
        
        let end_time = performance.now();
        console::log_1(&format!("VideoProcessor: Frame processing took {}ms", end_time - start_time).into());
        
        self.current_frame += 1;
        
        ImageData::new_with_u8_clamped_array_and_sh(processed_data.dyn_into()?, width, height)
    }
    
    #[wasm_bindgen]
    pub fn trim_video(&self, start_frame: u32, end_frame: u32) -> Result<JsValue, JsValue> {
        console::log_1(&format!("VideoProcessor: Trimming from frame {} to {}", start_frame, end_frame).into());
        
        // In a real implementation, this would set up trim points for the video export
        let result = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&result, &"startFrame".into(), &JsValue::from(start_frame));
        let _ = js_sys::Reflect::set(&result, &"endFrame".into(), &JsValue::from(end_frame));
        let _ = js_sys::Reflect::set(&result, &"status".into(), &JsValue::from("success"));
        
        Ok(result)
    }
    
    #[wasm_bindgen]
    pub fn generate_thumbnail(&self, width: u32, height: u32, frame_index: u32) -> String {
        // This would generate a thumbnail for a specific frame
        // For the sake of this example, we'll just return a placeholder
        console::log_1(&format!("VideoProcessor: Generating thumbnail for frame {}", frame_index).into());
        
        format!("thumbnail-data-for-frame-{}-{}x{}", frame_index, width, height)
    }
    
    #[wasm_bindgen]
    pub fn get_frame_count(&self, duration_ms: f64) -> u32 {
        ((duration_ms / 1000.0) * self.frame_rate).ceil() as u32
    }
}
