import { WebSocketServer } from 'ws';
import { SonioxSession } from './sonioxClient.js';
import { streamAnswer } from './openaiClient.js';

/**
 * Set up the WebSocket server on the given HTTP server.
 * Handles the full pipeline: audio → Soniox STT → OpenAI → streamed answer.
 */
export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (clientWs) => {
    console.log('[WS] Client connected');

    let sonioxSession = null;
    let isProcessing = false;
    let interviewPosition = '';
    let interviewLanguage = 'en';
    let interviewCompany = '';
    let interviewJobDescription = '';

    // Send a typed JSON message to the client
    function sendToClient(type, payload) {
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({ type, ...payload }));
      }
    }

    // Handle messages from the client
    clientWs.on('message', async (data, isBinary) => {
      // Binary data = audio chunk from microphone
      if (isBinary) {
        if (sonioxSession) {
          sonioxSession.sendAudio(data);
        }
        return;
      }

      // JSON control messages
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'start') {
          interviewPosition = msg.position || '';
          interviewLanguage = msg.language || 'en';
          interviewCompany = msg.company || '';
          interviewJobDescription = msg.jobDescription || '';
          await handleStart();
        } else if (msg.type === 'stop') {
          await handleStop();
        }
      } catch (err) {
        console.error('[WS] Failed to parse message:', err.message);
      }
    });

    /**
     * Start a new interview session:
     * - Connect to Soniox for STT
     * - Wire up token and endpoint events
     */
    async function handleStart() {
      if (sonioxSession) {
        // Clean up any existing session
        sonioxSession.close();
        sonioxSession = null;
      }

      sendToClient('status', { status: 'connecting' });

      try {
        sonioxSession = new SonioxSession(interviewLanguage);

        // Real-time transcript tokens
        sonioxSession.on('tokens', ({ finalText, nonFinalText, isFinal, language }) => {
          const cleanFinal = finalText?.replace(/<fin>/gi, '').trim() || '';
          const cleanNonFinal = nonFinalText?.replace(/<fin>/gi, '').trim() || '';
          sendToClient('transcript', {
            finalText: cleanFinal,
            nonFinalText: cleanNonFinal,
            isFinal,
            language,
          });
        });

        // Speaker stopped — send question to OpenAI
        sonioxSession.on('endpoint', async ({ text, language }) => {
          if (isProcessing) return; // Don't overlap
          const cleanText = text.replace(/<fin>/gi, '').trim();
          if (cleanText.length < 2) return; // Ignore very short or empty

          isProcessing = true;
          console.log(`[WS] Endpoint detected [${language}]: "${cleanText.substring(0, 80)}..."`);

          sendToClient('transcript', {
            finalText: cleanText,
            nonFinalText: '',
            isFinal: true,
            language,
            endpointReached: true,
          });

          // Stream OpenAI answer — use detected language if set to auto
          const answerLanguage = interviewLanguage === 'auto' ? (language || 'en') : interviewLanguage;
          try {
            sendToClient('ai_answer', { text: '', done: false, thinking: true });

            for await (const chunk of streamAnswer(cleanText, answerLanguage, interviewPosition, interviewCompany, interviewJobDescription)) {
              sendToClient('ai_answer', { text: chunk, done: false });
            }

            sendToClient('ai_answer', { text: '', done: true });
          } catch (err) {
            console.error('[WS] OpenAI error:', err.message);
            sendToClient('error', { message: 'Failed to generate AI answer' });
          }

          isProcessing = false;
        });

        // Soniox error
        sonioxSession.on('error', (errMsg) => {
          sendToClient('error', { message: `Soniox: ${errMsg}` });
        });

        // Soniox session closed
        sonioxSession.on('closed', () => {
          console.log('[WS] Soniox session closed');
        });

        await sonioxSession.connect();
        sendToClient('status', { status: 'recording' });
        console.log('[WS] Interview session started');
      } catch (err) {
        console.error('[WS] Failed to start Soniox:', err.message);
        sendToClient('error', { message: 'Failed to connect to speech service' });
        sendToClient('status', { status: 'error' });
      }
    }

    /**
     * Stop the current session gracefully.
     */
    async function handleStop() {
      if (sonioxSession) {
        sonioxSession.finalize();
        // Small delay to let finalization complete
        setTimeout(() => {
          if (sonioxSession) {
            sonioxSession.close();
            sonioxSession = null;
          }
          sendToClient('status', { status: 'stopped' });
          console.log('[WS] Interview session stopped');
        }, 1000);
      } else {
        sendToClient('status', { status: 'stopped' });
      }
    }

    // Cleanup on disconnect
    clientWs.on('close', () => {
      console.log('[WS] Client disconnected');
      if (sonioxSession) {
        sonioxSession.close();
        sonioxSession = null;
      }
    });

    clientWs.on('error', (err) => {
      console.error('[WS] Client error:', err.message);
      if (sonioxSession) {
        sonioxSession.close();
        sonioxSession = null;
      }
    });

    // Send ready status
    sendToClient('status', { status: 'connected' });
  });

  console.log('[WS] WebSocket server ready');
}
