import React from 'react';
import './IncomingCallModal.css';

const IncomingCallModal = ({ caller, onAnswer, onReject }) => {
  console.log('IncomingCallModal rendering with caller:', caller);
  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-modal">
        <div className="caller-avatar-large">
          {caller ? caller.charAt(0).toUpperCase() : '?'}
        </div>
        <h2>{caller ? caller.charAt(0).toUpperCase() + caller.slice(1) : 'Unknown'}</h2>
        <p className="call-status">Incoming voice call</p>
        <div className="call-buttons">
          <button className="reject-call-button" onClick={onReject}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="answer-call-button" onClick={onAnswer}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;

