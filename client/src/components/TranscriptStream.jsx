import { useEffect, useRef } from 'react';

const LANGUAGE_LABELS = {
  az: 'Azərbaycan',
  en: 'English',
  ru: 'Русский',
  tr: 'Türkçe',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  ar: 'العربية',
};

/**
 * TranscriptStream — Shows question history + live transcription.
 * Displays all past interview questions and the currently incoming text.
 */
export default function TranscriptStream({ finalText, interimText, language, isRecording, questionHistory }) {
  const scrollRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [finalText, interimText, questionHistory]);

  const langLabel = LANGUAGE_LABELS[language] || language;
  const hasContent = finalText || interimText;
  const hasHistory = questionHistory && questionHistory.length > 0;

  return (
    <div className="transcript-container">
      <div className="transcript-header">
        <div className="transcript-header-left">
          <div className={`transcript-dot ${isRecording ? 'transcript-dot--active' : ''}`} />
          <span className="transcript-label">
            {isRecording ? 'Listening...' : 'Transcript'}
          </span>
        </div>

        {language && (
          <span className="transcript-language-badge">{langLabel}</span>
        )}
      </div>

      <div className="transcript-body" ref={scrollRef}>
        {!hasContent && !isRecording && !hasHistory && (
          <p className="transcript-placeholder">
            Start capturing device audio to see live transcription here...
          </p>
        )}

        {/* Question history */}
        {hasHistory && questionHistory.map((q, i) => (
          <div key={i} className="transcript-history-item">
            <div className="transcript-history-number">Q{i + 1}</div>
            <p className="transcript-history-text">{q}</p>
          </div>
        ))}

        {/* Listening indicator when no live text yet */}
        {!hasContent && isRecording && (
          <div className="transcript-listening">
            <span className="listening-dots">
              <span>●</span><span>●</span><span>●</span>
            </span>
          </div>
        )}

        {/* Current live transcript */}
        {hasContent && (
          <div className="transcript-live">
            <div className="transcript-live-badge">LIVE</div>
            <p className="transcript-text">
              {finalText && <span className="transcript-final">{finalText}</span>}
              {interimText && <span className="transcript-interim">{interimText}</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
