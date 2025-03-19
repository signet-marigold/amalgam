use wasm_bindgen::prelude::*;
use js_sys::{Float32Array, Uint8Array, Array};
use web_sys::console;
use serde::{Serialize, Deserialize};

#[wasm_bindgen]
pub struct AudioProcessor {
    sample_rate: u32,
}

#[derive(Serialize, Deserialize)]
pub struct AudioMetadata {
    duration_ms: f64,
    sample_rate: u32,
    num_channels: u8,
}

#[wasm_bindgen]
impl AudioProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: u32) -> Self {
        console::log_1(&"AudioProcessor: Initializing...".into());
        
        Self {
            sample_rate,
        }
    }
    
    #[wasm_bindgen]
    pub fn generate_waveform(&self, audio_data: Float32Array, width: u32, height: u32) -> Result<Uint8Array, JsValue> {
        console::log_1(&"AudioProcessor: Generating waveform...".into());
        
        // Debug timing
        let window = web_sys::window().expect("no global window exists");
        let performance = window.performance().expect("performance should be available");
        let start_time = performance.now();
        
        // Get the JavaScript array and convert to Rust
        let samples_len = audio_data.length() as usize;
        let mut samples = vec![0.0; samples_len];
        audio_data.copy_to(&mut samples);
        
        // Calculate the number of samples per pixel
        let samples_per_pixel = samples_len / width as usize;
        
        // Generate waveform data
        // Each pixel in the waveform will be represented by 1 byte (intensity)
        let mut waveform_data = vec![0u8; width as usize];
        
        for i in 0..width as usize {
            let start_idx = i * samples_per_pixel;
            let end_idx = ((i + 1) * samples_per_pixel).min(samples_len);
            
            if start_idx >= samples_len {
                break;
            }
            
            // Calculate the max amplitude for this segment
            let mut max_amplitude = 0.0;
            for j in start_idx..end_idx {
                let amplitude = samples[j].abs();
                if amplitude > max_amplitude {
                    max_amplitude = amplitude;
                }
            }
            
            // Convert amplitude to pixel height (0-255)
            let pixel_height = (max_amplitude * (height as f32 / 2.0)) as u8;
            waveform_data[i] = pixel_height;
        }
        
        // Create UInt8Array to return to JavaScript
        let result = Uint8Array::new_with_length(waveform_data.len() as u32);
        result.copy_from(&waveform_data);
        
        let end_time = performance.now();
        console::log_1(&format!("AudioProcessor: Waveform generation took {}ms", end_time - start_time).into());
        
        Ok(result)
    }
    
    #[wasm_bindgen]
    pub fn normalize_audio(&self, audio_data: Float32Array) -> Result<Float32Array, JsValue> {
        console::log_1(&"AudioProcessor: Normalizing audio...".into());
        
        // Get the JavaScript array and convert to Rust
        let samples_len = audio_data.length() as usize;
        let mut samples = vec![0.0; samples_len];
        audio_data.copy_to(&mut samples);
        
        // Find the maximum amplitude
        let mut max_amplitude = 0.0f32;
        for sample in &samples {
            let amplitude = sample.abs();
            if amplitude > max_amplitude {
                max_amplitude = amplitude;
            }
        }
        
        // Normalize the samples if needed
        if max_amplitude > 0.0 && max_amplitude != 1.0 {
            let gain = 1.0 / max_amplitude;
            for i in 0..samples_len {
                samples[i] *= gain;
            }
        }
        
        // Create Float32Array to return to JavaScript
        let result = Float32Array::new_with_length(samples_len as u32);
        for (i, sample) in samples.iter().enumerate() {
            result.set_index(i as u32, *sample);
        }
        
        Ok(result)
    }
    
    #[wasm_bindgen]
    pub fn mix_audio_tracks(&self, tracks: Array) -> Result<Float32Array, JsValue> {
        let num_tracks = tracks.length();
        console::log_1(&format!("AudioProcessor: Mixing {} audio tracks...", num_tracks).into());
        
        if num_tracks == 0 {
            return Err(JsValue::from_str("No audio tracks provided for mixing"));
        }
        
        // Assume all tracks have the same length
        // In a real implementation, you'd need to handle tracks of different lengths
        let first_track: Float32Array = tracks.get(0).dyn_into()?;
        let samples_len = first_track.length() as usize;
        
        // Initialize the output buffer
        let mut mixed_samples = vec![0.0f32; samples_len];
        
        // Mix all tracks
        for i in 0..num_tracks {
            let track: Float32Array = tracks.get(i).dyn_into()?;
            let track_len = track.length() as usize;
            
            // Get track samples
            let mut track_samples = vec![0.0f32; track_len];
            track.copy_to(&mut track_samples);
            
            // Add to the mix buffer
            for j in 0..track_len.min(samples_len) {
                mixed_samples[j] += track_samples[j];
            }
        }
        
        // Prevent clipping by normalizing if values exceed [-1.0, 1.0]
        let mut max_amplitude = 0.0f32;
        for sample in &mixed_samples {
            let amplitude = sample.abs();
            if amplitude > max_amplitude {
                max_amplitude = amplitude;
            }
        }
        
        if max_amplitude > 1.0 {
            let gain = 1.0 / max_amplitude;
            for i in 0..samples_len {
                mixed_samples[i] *= gain;
            }
        }
        
        // Create Float32Array to return to JavaScript
        let result = Float32Array::new_with_length(samples_len as u32);
        for (i, sample) in mixed_samples.iter().enumerate() {
            result.set_index(i as u32, *sample);
        }
        
        Ok(result)
    }
}
