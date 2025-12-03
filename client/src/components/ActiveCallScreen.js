import React, { useState } from 'react';
import './ActiveCallScreen.css';

const ActiveCallScreen = ({ otherUser, onEndCall, onToggleMute, isMuted }) => {
  const [callDuration, setCallDuration] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="active-call-overlay">
      <div className="active-call-screen">
        <div className="caller-avatar-large">
          {otherUser ? otherUser.charAt(0).toUpperCase() : '?'}
        </div>
        <h2>{otherUser ? otherUser.charAt(0).toUpperCase() + otherUser.slice(1) : 'Unknown'}</h2>
        <p className="call-duration">{formatTime(callDuration)}</p>
        <div className="call-controls">
          <button 
            className={`mute-button ${isMuted ? 'muted' : ''}`}
            onClick={onToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 7l-6 6M11 7l6 6M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6L1 1" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" strokeLinecap="round"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M5 10h14M12 19v4M8 23h8" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          <button className="end-call-button" onClick={onEndCall} title="End call">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveCallScreen;

