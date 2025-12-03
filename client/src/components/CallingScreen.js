import React from 'react';
import './CallingScreen.css';

const CallingScreen = ({ otherUser, onCancelCall }) => {
  return (
    <div className="calling-overlay">
      <div className="calling-screen">
        <div className="caller-avatar-large">
          {otherUser ? otherUser.charAt(0).toUpperCase() : '?'}
        </div>
        <h2>{otherUser ? otherUser.charAt(0).toUpperCase() + otherUser.slice(1) : 'Unknown'}</h2>
        <p className="call-status">Calling...</p>
        <div className="calling-animation">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <button className="cancel-call-button" onClick={onCancelCall} title="Cancel call">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CallingScreen;

