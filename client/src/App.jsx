import { useState, useEffect, useCallback, useRef } from 'react';
import SetupPage from './components/SetupPage';
import ConfigPage from './components/ConfigPage';
import TranscriptStream from './components/TranscriptStream';
import AIResponseBox from './components/AIResponseBox';
import wsClient from './lib/WebsocketClient';
import { AudioCapture } from './lib/AudioCapture';


const audioCapture = new AudioCapture();

export default function App() {
  // Page state: 'setup' → 'config' → 'interview'
  const [page, setPage] = useState('setup');

  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle');
  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');

  // Transcript state
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState(null);

  // AI response state
  const [conversations, setConversations] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Refs for current answer accumulation
  const answerRef = useRef('');
  const currentQuestionRef = useRef('');
  const languageRef = useRef('en');

  // Connect WebSocket on mount
  useEffect(() => {
    wsClient.onTranscript = (msg) => {
      if (msg.language) {
        setDetectedLanguage(msg.language);
        languageRef.current = msg.language;
      }

      setFinalText(msg.finalText || '');
      setInterimText(msg.nonFinalText || '');

      if (msg.endpointReached && msg.finalText) {
        currentQuestionRef.current = msg.finalText;
      }
    };

    wsClient.onAiAnswer = (msg) => {
      if (msg.thinking) {
        setIsThinking(true);
        setCurrentAnswer('');
        answerRef.current = '';
        return;
      }

      if (msg.done) {
        setIsThinking(false);
        const fullAnswer = answerRef.current;
        const question = currentQuestionRef.current;

        if (question && fullAnswer) {
          setConversations(prev => [...prev, {
            question,
            answer: fullAnswer,
            language: languageRef.current,
          }]);
        }

        setCurrentAnswer('');
        answerRef.current = '';
        setFinalText('');
        setInterimText('');
        return;
      }

      setIsThinking(false);
      answerRef.current += msg.text;
      setCurrentAnswer(answerRef.current);
    };

    wsClient.onStatus = (newStatus) => {
      setStatus(newStatus);
    };

    wsClient.onError = (errorMsg) => {
      console.error('[App] Error:', errorMsg);
    };

    wsClient.connect().catch(console.error);

    return () => {
      wsClient.close();
      audioCapture.stop();
    };
  }, []);

  // Step 1: Setup form → go to config page
  const handleSetupComplete = useCallback((settings) => {
    setPosition(settings.position || '');
    setCompany(settings.company || '');
    setJobDescription(settings.jobDescription || '');
    setPage('config');
  }, []);

  // Step 2: Config page → trigger screen sharing → go to interview
  const handleConfigComplete = useCallback(async (config) => {
    const lang = config.language || 'auto';
    setSelectedLanguage(lang);

    try {
      await audioCapture.start((pcmData) => {
        wsClient.sendAudio(pcmData);
      });

      wsClient.sendStart(position, lang, company, jobDescription);
      setIsRecording(true);
      setFinalText('');
      setInterimText('');
      setPage('interview');
    } catch (err) {
      console.error('[App] Failed to start:', err);
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        alert('Screen sharing was cancelled. Please select a screen/tab and check "Share audio".');
      } else if (err.message?.includes('No audio track')) {
        alert('No audio captured. Make sure to check "Share audio" in the browser dialog.');
      } else {
        alert('Failed to capture device audio: ' + err.message);
      }
    }
  }, [position]);

  // Start recording (from interview page header)
  const handleStart = useCallback(async () => {
    try {
      await audioCapture.start((pcmData) => {
        wsClient.sendAudio(pcmData);
      });

      wsClient.sendStart(position, selectedLanguage, company, jobDescription);
      setIsRecording(true);
      setFinalText('');
      setInterimText('');
    } catch (err) {
      console.error('[App] Failed to start:', err);
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        alert('Screen sharing was cancelled. Please select a tab or screen and check "Share audio" to capture device audio.');
      } else if (err.message?.includes('No audio track')) {
        alert('No audio was captured. When sharing, make sure to check "Share audio" or "Share system audio" in the browser dialog.');
      } else {
        alert('Failed to capture device audio: ' + err.message);
      }
    }
  }, [position, selectedLanguage, company, jobDescription]);

  // Stop recording
  const handleStop = useCallback(() => {
    audioCapture.stop();
    wsClient.sendStop();
    setIsRecording(false);
  }, []);

  // Back to setup
  const handleBackToSetup = useCallback(() => {
    if (isRecording) handleStop();
    setConversations([]);
    setCurrentAnswer('');
    setFinalText('');
    setInterimText('');
    setPage('setup');
  }, [isRecording, handleStop]);

  // ===== Setup Page (Step 1) =====
  if (page === 'setup') {
    return <SetupPage onStart={handleSetupComplete} />;
  }

  // ===== Config Page (Step 2) =====
  if (page === 'config') {
    return (
      <ConfigPage
        onNext={handleConfigComplete}
        onBack={() => setPage('setup')}
      />
    );
  }

  // ===== Interview Page (Step 3) =====
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <button className="header-back-btn" onClick={handleBackToSetup} title="Back to setup">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="app-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <h1 className="app-title">InterAI</h1>
        </div>

        <div className="header-controls">
          <div className="header-position-badge" title={position}>
            {position || 'No position set'}
          </div>
          <select
            id="language-select"
            className="header-select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isRecording}
          >
            <option value="auto">Auto Detect</option>
            <option value="az">Azərbaycanca</option>
            <option value="en">English</option>
            <option value="ru">Русский</option>
            <option value="tr">Türkçe</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
            <option value="ar">العربية</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
          </select>
          <button
            id="start-button"
            className={`start-button ${isRecording ? 'start-button--recording' : ''}`}
            onClick={isRecording ? handleStop : handleStart}
          >
            {isRecording ? (
              <>
                <span className="start-button-dot start-button-dot--recording" />
                Stop
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
                Start
              </>
            )}
          </button>
          {status === 'recording' && (
            <div className="header-live-badge">
              <span className="header-live-dot" />
              LIVE
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <section className="content-section">
          <TranscriptStream
            finalText={finalText}
            interimText={interimText}
            language={detectedLanguage}
            isRecording={isRecording}
            questionHistory={conversations.map(c => c.question)}
          />

          <AIResponseBox
            conversations={conversations}
            currentAnswer={currentAnswer}
            isThinking={isThinking}
          />
        </section>
      </main>
    </div>
  );
}
