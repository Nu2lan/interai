import { useState } from 'react';

/**
 * MicrophoneButton — Large circular start/stop button with animated ring.
 */
export default function MicrophoneButton({ isRecording, onStart, onStop, status }) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (isRecording) {
      onStop?.();
    } else {
      onStart?.();
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connecting': return 'Connecting...';
      case 'recording': return 'Capturing audio — tap to stop';
      case 'stopped': return 'Tap to capture device audio';
      case 'error': return 'Error — tap to retry';
      default: return 'Tap to capture device audio';
    }
  };

  return (
    <div className="mic-button-container">
      {/* Pulse rings when recording */}
      {isRecording && (
        <>
          <div className="mic-pulse-ring mic-pulse-ring--1" />
          <div className="mic-pulse-ring mic-pulse-ring--2" />
          <div className="mic-pulse-ring mic-pulse-ring--3" />
        </>
      )}

      <button
        id="mic-button"
        className={`mic-button ${isRecording ? 'mic-button--recording' : ''} ${isHovered ? 'mic-button--hovered' : ''}`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={isRecording ? 'Stop capture' : 'Capture device audio'}
      >
        {isRecording ? (
          // Stop icon
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          // Headphone/speaker icon — device audio capture
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
        )}
      </button>

      <p className="mic-status-text">{getStatusText()}</p>
    </div>
  );
}
