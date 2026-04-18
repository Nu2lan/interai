const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

/**
 * WebSocket client manager for the InterAI realtime pipeline.
 * Handles connection lifecycle, auto-reconnect, and typed message routing.
 */
class WebsocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.shouldReconnect = false;

    // Callbacks
    this.onTranscript = null;
    this.onAiAnswer = null;
    this.onStatus = null;
    this.onError = null;
  }

  /**
   * Connect to the WebSocket server.
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      this.shouldReconnect = true;
      this.ws = new WebSocket(WS_URL);

      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'transcript':
              this.onTranscript?.(msg);
              break;
            case 'ai_answer':
              this.onAiAnswer?.(msg);
              break;
            case 'status':
              this.onStatus?.(msg.status);
              break;
            case 'error':
              this.onError?.(msg.message);
              break;
            default:
              console.warn('[WS] Unknown message type:', msg.type);
          }
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          this.reconnectAttempts++;
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
          setTimeout(() => this.connect().catch(console.error), delay);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        this.onError?.('WebSocket connection error');
        reject(err);
      };
    });
  }

  /**
   * Send binary audio data to the server.
   * @param {ArrayBuffer|Int16Array} audioData
   */
  sendAudio(audioData) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(audioData instanceof ArrayBuffer ? audioData : audioData.buffer);
    }
  }

  /**
   * Send a control message to start recording.
   * @param {string} position - The job position being interviewed for
   * @param {string} language - The interview language code
   * @param {string} company - The company name
   * @param {string} jobDescription - The job description
   */
  sendStart(position = '', language = 'en', company = '', jobDescription = '') {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'start', position, language, company, jobDescription }));
    }
  }

  /**
   * Send a control message to stop recording.
   */
  sendStop() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stop' }));
    }
  }

  /**
   * Close the WebSocket connection.
   */
  close() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton
const wsClient = new WebsocketClient();
export default wsClient;
