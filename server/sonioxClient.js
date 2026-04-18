import WebSocket from 'ws';
import { EventEmitter } from 'events';

const SONIOX_WS_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';

// How long to wait after last speech activity before triggering AI (ms)
const SILENCE_TIMEOUT_MS = 1500;

/**
 * Creates a Soniox streaming STT session via raw WebSocket.
 * Emits: 'tokens', 'endpoint', 'error', 'closed'
 *
 * Endpoint detection strategy (dual approach):
 * 1. Explicit: Soniox `endpoint_detected` / `ep_detected` field in response
 * 2. Silence debounce: If final tokens exist and no new speech arrives for 1.5s,
 *    treat it as an endpoint (HR person stopped talking)
 */
export class SonioxSession extends EventEmitter {
  constructor(preferredLanguage = 'auto') {
    super();
    this.ws = null;
    this.finalTokens = [];
    this.connected = false;
    this.lastLanguage = preferredLanguage === 'auto' ? 'en' : preferredLanguage;
    this.preferredLanguage = preferredLanguage;
    this._silenceTimer = null;
  }

  /**
   * Connect to Soniox and send configuration.
   */
  connect() {
    return new Promise((resolve, reject) => {
      const apiKey = process.env.SONIOX_API_KEY;
      if (!apiKey) {
        return reject(new Error('Missing SONIOX_API_KEY environment variable'));
      }

      this.ws = new WebSocket(SONIOX_WS_URL);

      this.ws.on('open', () => {
        // Send configuration as the first message
        // Build language hints — prioritize selected language
        const defaultHints = ['az', 'en', 'ru', 'tr', 'de', 'fr', 'es', 'ar', 'zh', 'ja', 'ko'];
        let languageHints;
        if (this.preferredLanguage && this.preferredLanguage !== 'auto') {
          // Put the preferred language first, then others
          languageHints = [this.preferredLanguage, ...defaultHints.filter(l => l !== this.preferredLanguage)];
        } else {
          languageHints = defaultHints;
        }

        const config = {
          api_key: apiKey,
          model: 'stt-rt-v4',
          audio_format: 'pcm_s16le',
          sample_rate: 16000,
          num_channels: 1,
          language_hints: languageHints,
          enable_language_identification: true,
          enable_endpoint_detection: true,
        };

        this.ws.send(JSON.stringify(config));
        this.connected = true;
        console.log('[Soniox] Connected and configured');
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const res = JSON.parse(data.toString());

          // Handle errors from Soniox
          if (res.error_code) {
            console.error(`[Soniox] Error: ${res.error_code} - ${res.error_message}`);
            this.emit('error', res.error_message);
            return;
          }

          // Parse tokens from this response
          const nonFinalTokens = [];
          let gotNewFinal = false;
          let endTokenDetected = false;

          if (res.tokens) {
            for (const token of res.tokens) {
              if (token.text) {
                // Soniox sends <end> token to signal endpoint
                const cleanText = token.text.trim();
                if (cleanText === '<end>' || cleanText === '<END>') {
                  endTokenDetected = true;
                  console.log('[Soniox] <end> token detected');
                  continue; // Don't add to transcript
                }

                if (token.is_final) {
                  this.finalTokens.push(token);
                  gotNewFinal = true;
                } else {
                  nonFinalTokens.push(token);
                }
                // Track detected language
                if (token.language) {
                  this.lastLanguage = token.language;
                }
              }
            }
          }

          // Build current text views (without <end> tokens)
          const finalText = this.finalTokens.map(t => t.text).join('');
          const nonFinalText = nonFinalTokens.map(t => t.text).join('');

          this.emit('tokens', {
            finalText,
            nonFinalText,
            isFinal: nonFinalTokens.length === 0 && this.finalTokens.length > 0,
            language: this.lastLanguage,
          });

          // === ENDPOINT DETECTION ===

          // Strategy 1: <end> token from Soniox (most reliable)
          if (endTokenDetected && this.finalTokens.length > 0) {
            console.log('[Soniox] Endpoint via <end> token');
            this._fireEndpoint();
            return;
          }

          // Strategy 2: Explicit Soniox endpoint signal field
          const explicitEndpoint = res.endpoint_detected || res.ep_detected;
          if (explicitEndpoint) {
            console.log('[Soniox] Explicit endpoint field detected');
            this._fireEndpoint();
            return;
          }

          // Strategy 3: Silence debounce
          // If we have accumulated final text, start/reset a silence timer
          // The timer fires if no new tokens arrive within SILENCE_TIMEOUT_MS
          if (this.finalTokens.length > 0) {
            // If we got new final tokens and there are NO non-final tokens,
            // it suggests the speaker may have paused — start the timer
            if (gotNewFinal && nonFinalTokens.length === 0) {
              this._startSilenceTimer();
            } else if (nonFinalTokens.length > 0) {
              // Speaker is still talking (non-final text arriving), reset timer
              this._resetSilenceTimer();
            }
          }

          // Session finished
          if (res.finished) {
            this._resetSilenceTimer();
            this._fireEndpoint();
            this.emit('closed');
          }
        } catch (err) {
          console.error('[Soniox] Parse error:', err.message);
        }
      });

      this.ws.on('error', (err) => {
        console.error('[Soniox] WebSocket error:', err.message);
        this.emit('error', err.message);
        if (!this.connected) reject(err);
      });

      this.ws.on('close', () => {
        this._resetSilenceTimer();
        this.connected = false;
        this.emit('closed');
      });
    });
  }

  /**
   * Fire an endpoint event with accumulated final text, then reset.
   */
  _fireEndpoint() {
    const fullText = this.finalTokens.map(t => t.text).join('').trim();
    if (fullText.length > 2) {
      console.log(`[Soniox] Endpoint → "${fullText.substring(0, 80)}..." [${this.lastLanguage}]`);
      this.emit('endpoint', {
        text: fullText,
        language: this.lastLanguage || 'en',
      });
    }
    this.finalTokens = [];
    this._resetSilenceTimer();
  }

  /**
   * Start the silence debounce timer.
   */
  _startSilenceTimer() {
    this._resetSilenceTimer();
    this._silenceTimer = setTimeout(() => {
      if (this.finalTokens.length > 0) {
        console.log('[Soniox] Silence timeout → triggering endpoint');
        this._fireEndpoint();
      }
    }, SILENCE_TIMEOUT_MS);
  }

  /**
   * Clear the silence timer.
   */
  _resetSilenceTimer() {
    if (this._silenceTimer) {
      clearTimeout(this._silenceTimer);
      this._silenceTimer = null;
    }
  }

  /**
   * Forward raw audio data to Soniox.
   * @param {Buffer} audioBuffer - Raw PCM audio bytes
   */
  sendAudio(audioBuffer) {
    if (this.ws && this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioBuffer);
    }
  }

  /**
   * Send finalize command to force pending tokens to become final.
   */
  finalize() {
    if (this.ws && this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'finalize' }));
    }
  }

  /**
   * Close the Soniox session gracefully.
   */
  close() {
    this._resetSilenceTimer();
    if (this.ws) {
      // Send empty string to signal end-of-audio
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('');
      }
      this.connected = false;
      setTimeout(() => {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
          this.ws.close();
        }
      }, 500);
    }
  }
}
