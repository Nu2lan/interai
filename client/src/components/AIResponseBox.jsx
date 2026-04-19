import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * AIResponseBox — Displays the AI interview response with typing animation.
 * Shows conversation history of all Q&A pairs.
 * Supports Document Picture-in-Picture for floating overlay on meeting tabs.
 */
export default function AIResponseBox({ conversations, currentAnswer, isThinking }) {
  const scrollRef = useRef(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [pipWindow, setPipWindow] = useState(null);
  const [pipSupported] = useState(() => 'documentPictureInPicture' in window);

  // Auto-scroll to top (newest first)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [conversations, currentAnswer]);

  // Clean up PiP on unmount
  useEffect(() => {
    return () => {
      if (pipWindow) pipWindow.close();
    };
  }, [pipWindow]);

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const togglePiP = useCallback(async () => {
    // Close existing PiP
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }

    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 420,
        height: 500,
      });

      // Copy styles into PiP window
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach((s) => {
        pip.document.head.appendChild(s.cloneNode(true));
      });

      // Add PiP-specific styles
      const pipStyle = pip.document.createElement('style');
      pipStyle.textContent = `
        body {
          margin: 0;
          background: #07070d;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
        }
        .pip-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }
        .pip-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(18, 18, 31, 0.95);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .pip-header .ai-mini-avatar {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: linear-gradient(135deg, rgba(245,166,35,0.15), rgba(245,166,35,0.05));
          border: 1px solid rgba(245,166,35,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          font-weight: 800;
          color: #f5a623;
        }
        .pip-header span {
          font-size: 0.85rem;
          font-weight: 700;
          color: rgba(255,255,255,0.9);
        }
        .pip-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        .pip-body::-webkit-scrollbar { width: 4px; }
        .pip-body::-webkit-scrollbar-track { background: transparent; }
        .pip-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .pip-answer {
          font-size: 0.95rem;
          line-height: 1.7;
          color: rgba(255,255,255,0.88);
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .pip-thinking {
          display: flex;
          gap: 6px;
          padding: 12px 0;
        }
        .pip-thinking span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f5a623;
          animation: pip-pulse 1.2s ease-in-out infinite;
        }
        .pip-thinking span:nth-child(2) { animation-delay: 0.15s; }
        .pip-thinking span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes pip-pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        .pip-cursor {
          color: #f5a623;
          animation: pip-blink 0.8s step-end infinite;
        }
        @keyframes pip-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .pip-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: rgba(255,255,255,0.3);
          font-size: 0.85rem;
          gap: 8px;
        }
        .pip-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.06);
          margin: 12px 0;
        }
      `;
      pip.document.head.appendChild(pipStyle);

      // Create root container
      const root = pip.document.createElement('div');
      root.id = 'pip-root';
      pip.document.body.appendChild(root);

      setPipWindow(pip);

      pip.addEventListener('pagehide', () => {
        setPipWindow(null);
      });
    } catch (err) {
      console.error('Failed to open PiP:', err);
    }
  }, [pipWindow]);

  const hasContent = conversations.length > 0 || currentAnswer;

  // Render the PiP content
  const pipContent = pipWindow ? createPortal(
    <div className="pip-container">
      <div className="pip-header">
        <div className="ai-mini-avatar">AI</div>
        <span>InterAI Assistant</span>
      </div>
      <div className="pip-body">
        {!hasContent && (
          <div className="pip-empty">
            <span>💬</span>
            <span>Waiting for questions...</span>
          </div>
        )}

        {(isThinking || currentAnswer) && (
          <div className="pip-answer">
            {isThinking && !currentAnswer ? (
              <div className="pip-thinking">
                <span /><span /><span />
              </div>
            ) : (
              <>
                {currentAnswer}
                <span className="pip-cursor">|</span>
              </>
            )}
          </div>
        )}

        {[...conversations].reverse().map((conv, i) => (
          <div key={conversations.length - 1 - i}>
            {(i > 0 || isThinking || currentAnswer) && <hr className="pip-divider" />}
            <div className="pip-answer">{conv.answer}</div>
          </div>
        ))}
      </div>
    </div>,
    pipWindow.document.getElementById('pip-root')
  ) : null;

  return (
    <div className="ai-response-container">
      <div className="ai-response-header">
        <div className="ai-response-header-left">
          <div className="ai-avatar">AI</div>
          <span className="ai-label">Interview Assistant</span>
        </div>
        {pipSupported && (
          <button
            className={`pip-button ${pipWindow ? 'pip-button--active' : ''}`}
            onClick={togglePiP}
            title={pipWindow ? 'Close Picture-in-Picture' : 'Open Picture-in-Picture'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <rect x="12" y="9" width="8" height="6" rx="1" />
              <line x1="2" y1="21" x2="22" y2="21" />
            </svg>
            {pipWindow ? 'Close PiP' : 'PiP'}
          </button>
        )}
      </div>

      <div className="ai-response-body" ref={scrollRef}>
        {!hasContent && (
          <div className="ai-response-empty">
            <div className="ai-response-empty-icon">💬</div>
            <p>AI responses will appear here after you ask a question...</p>
          </div>
        )}

        {/* Current streaming answer — always on top */}
        {(isThinking || currentAnswer) && (
          <div className="conversation-pair conversation-pair--active">
            {currentAnswer !== undefined && (
              <div className="conversation-answer conversation-answer--streaming">
                <div className="conversation-role conversation-role--ai">
                  <div className="ai-mini-avatar">AI</div>
                  Assistant
                </div>
                {isThinking && !currentAnswer ? (
                  <div className="ai-thinking">
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                  </div>
                ) : (
                  <p>
                    {currentAnswer}
                    <span className="typing-cursor">|</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Answer history — newest first */}
        {[...conversations].reverse().map((conv, i) => {
          const originalIndex = conversations.length - 1 - i;
          return (
            <div key={originalIndex} className="conversation-pair">
              <div className="conversation-answer">
                <div className="conversation-answer-header">
                  <div className="conversation-role conversation-role--ai">
                    <div className="ai-mini-avatar">AI</div>
                    Assistant
                  </div>
                  <button
                    className="copy-button"
                    onClick={() => handleCopy(conv.answer, originalIndex)}
                    title="Copy answer"
                  >
                    {copiedIndex === originalIndex ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
                <p>{conv.answer}</p>
              </div>
            </div>
          );
        })}

      </div>

      {/* PiP portal */}
      {pipContent}
    </div>
  );
}
