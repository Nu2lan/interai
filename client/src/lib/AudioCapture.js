/**
 * AudioCapture — Handles device/system audio capture, PCM conversion, and downsampling.
 * Captures audio output from the device (e.g. video call, browser tab) via getDisplayMedia:
 * - Raw PCM Int16 chunks for WebSocket transmission
 * - AnalyserNode for waveform visualization
 *
 * The user will see a browser picker to select which tab/screen to capture audio from.
 * They must check "Share audio" / "Share system audio" in the picker dialog.
 */
export class AudioCapture {
  constructor() {
    this.stream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.processorNode = null;
    this.isCapturing = false;
    this.onAudioData = null; // callback: (Int16Array) => void
  }

  /**
   * Start capturing device/system audio via screen/tab sharing.
   * The browser will show a picker — the user must enable "Share audio".
   * @param {Function} onAudioData - Callback receiving Int16Array PCM chunks
   * @returns {AnalyserNode} - For waveform visualization
   */
  async start(onAudioData) {
    this.onAudioData = onAudioData;

    // Create audio context synchronously on user click to avoid autoplay restrictions
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000,
    });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Request screen/tab share with audio — this is how we capture device audio
    // The user must check "Share audio" in the browser picker dialog
    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,  // Required by the API, but we won't use the video track
      audio: true,  // This captures the device/tab audio output
    });

    // Stop the video track immediately — we only need audio
    const videoTracks = this.stream.getVideoTracks();
    videoTracks.forEach(track => track.stop());

    // Verify we actually got an audio track
    const audioTracks = this.stream.getAudioTracks();
    if (audioTracks.length === 0) {
      this.stream.getTracks().forEach(t => t.stop());
      throw new Error('No audio track captured. Make sure to check "Share audio" when selecting the screen/tab.');
    }

    // Create an audio-only stream from the audio track
    const audioStream = new MediaStream(audioTracks);

    // Source from device audio
    this.sourceNode = this.audioContext.createMediaStreamSource(audioStream);

    // Analyser for visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;
    this.sourceNode.connect(this.analyserNode);

    // ScriptProcessor for PCM capture (AudioWorklet is better but heavier to set up)
    const bufferSize = 4096;
    this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processorNode.onaudioprocess = (event) => {
      if (!this.isCapturing) return;

      const float32Data = event.inputBuffer.getChannelData(0);
      const pcm16 = this._float32ToInt16(float32Data);

      this.onAudioData?.(pcm16);
    };

    // Connect the pipeline
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    this.isCapturing = true;
    return this.analyserNode;
  }

  /**
   * Stop capturing and release resources.
   */
  stop() {
    this.isCapturing = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.analyserNode = null;
    this.onAudioData = null;
  }

  /**
   * Convert Float32 audio samples to Int16 PCM.
   * @param {Float32Array} float32Arr
   * @returns {Int16Array}
   */
  _float32ToInt16(float32Arr) {
    const int16Arr = new Int16Array(float32Arr.length);
    for (let i = 0; i < float32Arr.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Arr[i]));
      int16Arr[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Arr;
  }

  /**
   * Get the analyser node for waveform visualization.
   * @returns {AnalyserNode|null}
   */
  getAnalyser() {
    return this.analyserNode;
  }
}
