import { useEffect, useRef, useState } from 'react';

/**
 * AIResponseBox — Displays the AI interview response with typing animation.
 * Shows conversation history of all Q&A pairs.
 */
export default function AIResponseBox({ conversations, currentAnswer, isThinking }) {
  const scrollRef = useRef(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Auto-scroll to top (newest first)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [conversations, currentAnswer]);

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const hasContent = conversations.length > 0 || currentAnswer;

  return (
    <div className="ai-response-container">
      <div className="ai-response-header">
        <div className="ai-response-header-left">
          <div className="ai-avatar">AI</div>
          <span className="ai-label">Interview Assistant</span>
        </div>

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
    </div>
  );
}
