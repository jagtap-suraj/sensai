// src/lib/worklets/pcm-processor.ts

// This string contains the code for our AudioWorkletProcessor.
// It's defined as a string to be easily converted into a Blob URL for loading.
const PCMProcessorScript = `
class PCMProcessor extends AudioWorkletProcessor {
  // Buffer to hold Int16 samples.
  // Send and clear buffer around every 120-128ms.
  // For 16000Hz, 2048 samples is 128ms.
  // Gemini Live API examples often use small chunks for low latency.
  // Let's use a buffer size that aligns with common examples, e.g., 2048 or 4096.
  // We can adjust this based on performance and API behavior.
  buffer = new Int16Array(2048); 
  bufferWriteIndex = 0; // Current write index for the buffer.
  targetSampleRate = 16000; // Expected sample rate from the AudioContext

  constructor(options) {
    super(options);
    // options.processorOptions.targetSampleRate can be used if AudioContext sample rate varies
    // but we aim to set AudioContext to 16000Hz directly.
    if (options && options.processorOptions && options.processorOptions.targetSampleRate) {
      this.targetSampleRate = options.processorOptions.targetSampleRate;
    }
    // console.log(\`PCMProcessor initialized with sample rate: \${currentSampleRate}, target: \${this.targetSampleRate}\`);
  }

  /**
   * Called by the browser's audio engine with new audio data.
   * @param {Float32Array[][]} inputs - Array of inputs, each input is an array of channels,
   *                                   each channel is a Float32Array of audio samples.
   *                                   We expect mono input: inputs[0][0].
   * @param {Float32Array[][]} outputs - Array of outputs (not used by this processor).
   * @param {Record<string, Float32Array>} parameters - Audio parameters (not used here).
   * @returns {boolean} - True to keep the processor alive.
   */
  process(inputs, outputs, parameters) {
    // Assuming mono audio input from the first channel of the first input.
    const inputChannelData = inputs[0]?.[0];

    if (inputChannelData) {
      // Downsample and convert to PCM16 if necessary
      // For this worklet, we assume the AudioContext it's running in is already at 16kHz.
      // Thus, inputChannelData should already be at 16kHz.
      // We just need to convert Float32 to Int16.

      for (let i = 0; i < inputChannelData.length; i++) {
        // Clamp the sample to the range [-1, 1] and convert to Int16
        const sample = Math.max(-1, Math.min(1, inputChannelData[i]));
        // Scale to 16-bit signed integer range.
        // Positive values up to 32767, negative values down to -32768.
        this.buffer[this.bufferWriteIndex++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;

        // If the buffer is full, send it to the main thread.
        if (this.bufferWriteIndex >= this.buffer.length) {
          this.sendData();
        }
      }
    }
    return true; // Keep the processor alive.
  }

  sendData() {
    // Send a copy of the buffer's content up to the current write index.
    // We send the underlying ArrayBuffer.
    // console.log('[Worklet] Sending data to main thread, byteLength:', this.buffer.slice(0, this.bufferWriteIndex).buffer.byteLength);
    this.port.postMessage(this.buffer.slice(0, this.bufferWriteIndex).buffer);
    this.bufferWriteIndex = 0; // Reset the write index.
  }
}

// Register the processor with the AudioWorkletGlobalScope.
// The name 'pcm-processor' is what we'll use to instantiate it on the main thread.
registerProcessor('pcm-processor', PCMProcessor);
`;

export default PCMProcessorScript;
