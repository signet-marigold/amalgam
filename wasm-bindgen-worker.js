// Web Worker for handling WebAssembly operations
// This worker helps offload expensive WASM operations to a separate thread

// Store our initialized WASM module
let wasmModule = null;

// Handle messages from the main thread
self.onmessage = async function(event) {
  const { type, id, data } = event.data;
  
  try {
    // Initialize the WASM module if not already done
    if (!wasmModule && type !== 'init') {
      self.postMessage({
        id,
        error: 'WASM module not initialized. Call init first.',
        success: false
      });
      return;
    }
    
    // Process different operation types
    switch (type) {
      case 'init':
        await initWasmModule(data.modulePath);
        self.postMessage({ id, success: true });
        break;
        
      case 'processVideoFrame':
        processVideoFrame(id, data);
        break;
        
      case 'generateWaveform':
        generateWaveform(id, data);
        break;
        
      case 'trimVideo':
        trimVideo(id, data);
        break;
        
      case 'normalizeAudio':
        normalizeAudio(id, data);
        break;
      
      case 'mixAudioTracks':
        mixAudioTracks(id, data);
        break;
        
      default:
        self.postMessage({
          id,
          error: `Unknown operation type: ${type}`,
          success: false
        });
    }
  } catch (error) {
    console.error(`Worker error (${type}):`, error);
    self.postMessage({
      id,
      error: `Error in worker: ${error.message || 'Unknown error'}`,
      success: false
    });
  }
};

// Initialize the WebAssembly module
async function initWasmModule(modulePath) {
  try {
    // Import the WASM module
    const importObject = {
      env: {
        memory: new WebAssembly.Memory({ initial: 256, maximum: 512 })
      }
    };
    
    // Fetch the WASM module
    const response = await fetch(modulePath);
    const wasmBytes = await response.arrayBuffer();
    
    // Instantiate the module
    const result = await WebAssembly.instantiate(wasmBytes, importObject);
    
    // Store the module
    wasmModule = result.instance.exports;
    
    console.log('WASM module initialized in worker');
  } catch (error) {
    console.error('Failed to initialize WASM module in worker:', error);
    throw error;
  }
}

// Process a video frame using the WASM module
function processVideoFrame(id, data) {
  try {
    const { width, height, pixels } = data;
    
    // Create a buffer in the WASM memory for the input pixels
    const inputPtr = wasmModule.allocate(width * height * 4);
    
    // Copy the input pixels to WASM memory
    const memory = new Uint8Array(wasmModule.memory.buffer);
    memory.set(new Uint8Array(pixels), inputPtr);
    
    // Process the frame using WASM
    const outputPtr = wasmModule.process_video_frame(inputPtr, width, height);
    
    // Copy the processed pixels back
    const processedPixels = new Uint8Array(memory.buffer, outputPtr, width * height * 4);
    const result = new Uint8ClampedArray(processedPixels);
    
    // Free memory
    wasmModule.deallocate(inputPtr);
    wasmModule.deallocate(outputPtr);
    
    // Return the result
    self.postMessage({
      id,
      result: {
        width,
        height,
        pixels: result
      },
      success: true
    }, [result.buffer]);
  } catch (error) {
    console.error('Error processing video frame in worker:', error);
    self.postMessage({
      id,
      error: `Error processing video frame: ${error.message || 'Unknown error'}`,
      success: false
    });
  }
}

// Generate a waveform visualization from audio data
function generateWaveform(id, data) {
  try {
    const { audioData, width, height } = data;
    
    // Create a buffer in the WASM memory for the audio data
    const audioPtr = wasmModule.allocate(audioData.length * 4); // Float32Array = 4 bytes per element
    
    // Copy the audio data to WASM memory
    const memory = new Float32Array(wasmModule.memory.buffer);
    memory.set(new Float32Array(audioData), audioPtr / 4); // Divide by 4 because we're addressing Float32Array elements
    
    // Generate the waveform using WASM
    const outputPtr = wasmModule.generate_waveform(audioPtr, audioData.length, width, height);
    
    // Copy the waveform data back
    const waveformData = new Uint8Array(memory.buffer, outputPtr, width);
    const result = new Uint8Array(waveformData);
    
    // Free memory
    wasmModule.deallocate(audioPtr);
    wasmModule.deallocate(outputPtr);
    
    // Return the result
    self.postMessage({
      id,
      result: result,
      success: true
    }, [result.buffer]);
  } catch (error) {
    console.error('Error generating waveform in worker:', error);
    self.postMessage({
      id,
      error: `Error generating waveform: ${error.message || 'Unknown error'}`,
      success: false
    });
  }
}

// Trim a video clip
function trimVideo(id, data) {
  try {
    const { startFrame, endFrame } = data;
    
    // Call the WASM trim function
    const resultPtr = wasmModule.trim_video(startFrame, endFrame);
    
    // Parse the result
    const result = {
      startFrame,
      endFrame,
      status: 'success'
    };
    
    // Return the result
    self.postMessage({
      id,
      result,
      success: true
    });
  } catch (error) {
    console.error('Error trimming video in worker:', error);
    self.postMessage({
      id,
      error: `Error trimming video: ${error.message || 'Unknown error'}`,
      success: false
    });
  }
}

// Normalize audio levels
function normalizeAudio(id, data) {
  try {
    const { audioData } = data;
    
    // Create a buffer in the WASM memory for the audio data
    const audioPtr = wasmModule.allocate(audioData.length * 4);
    
    // Copy the audio data to WASM memory
    const memory = new Float32Array(wasmModule.memory.buffer);
    memory.set(new Float32Array(audioData), audioPtr / 4);
    
    // Normalize the audio using WASM
    const outputPtr = wasmModule.normalize_audio(audioPtr, audioData.length);
    
    // Copy the normalized audio data back
    const normalizedData = new Float32Array(memory.buffer, outputPtr, audioData.length);
    const result = new Float32Array(normalizedData);
    
    // Free memory
    wasmModule.deallocate(audioPtr);
    wasmModule.deallocate(outputPtr);
    
    // Return the result
    self.postMessage({
      id,
      result: result,
      success: true
    }, [result.buffer]);
  } catch (error) {
    console.error('Error normalizing audio in worker:', error);
    self.postMessage({
      id,
      error: `Error normalizing audio: ${error.message || 'Unknown error'}`,
      success: false
    });
  }
}

// Mix multiple audio tracks together
function mixAudioTracks(id, data) {
  try {
    const { tracks, sampleRate } = data;
    
    // For each track, we'll create a buffer in WASM memory
    const trackPtrs = [];
    const trackLengths = [];
    
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const audioPtr = wasmModule.allocate(track.length * 4);
      
      // Copy the track data to WASM memory
      const memory = new Float32Array(wasmModule.memory.buffer);
      memory.set(new Float32Array(track), audioPtr / 4);
      
      trackPtrs.push(audioPtr);
      trackLengths.push(track.length);
    }
    
    // Create a pointer array in WASM memory
    const ptrArrayPtr = wasmModule.allocate(tracks.length * 4);
    const ptrs = new Uint32Array(wasmModule.memory.buffer, ptrArrayPtr, tracks.length);
    for (let i = 0; i < trackPtrs.length; i++) {
      ptrs[i] = trackPtrs[i];
    }
    
    // Create a length array in WASM memory
    const lengthArrayPtr = wasmModule.allocate(tracks.length * 4);
    const lengths = new Uint32Array(wasmModule.memory.buffer, lengthArrayPtr, tracks.length);
    for (let i = 0; i < trackLengths.length; i++) {
      lengths[i] = trackLengths[i];
    }
    
    // Mix the tracks using WASM
    const outputPtr = wasmModule.mix_audio_tracks(ptrArrayPtr, lengthArrayPtr, tracks.length);
    
    // Determine the output length (maximum of all tracks)
    const outputLength = Math.max(...trackLengths);
    
    // Copy the mixed audio data back
    const mixedData = new Float32Array(wasmModule.memory.buffer, outputPtr, outputLength);
    const result = new Float32Array(mixedData);
    
    // Free memory
    trackPtrs.forEach(ptr => wasmModule.deallocate(ptr));
    wasmModule.deallocate(ptrArrayPtr);
    wasmModule.deallocate(lengthArrayPtr);
    wasmModule.deallocate(outputPtr);
    
    // Return the result
    self.postMessage({
      id,
      result: result,
      success: true
    }, [result.buffer]);
  } catch (error) {
    console.error('Error mixing audio tracks in worker:', error);
    self.postMessage({
      id,
      error: `Error mixing audio tracks: ${error.message || 'Unknown error'}`,
      success: false
    });
  }
}
