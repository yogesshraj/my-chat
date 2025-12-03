import React from 'react';
import './ChatHeader.css';

const ChatHeader = ({ user, otherUser, onLogout, onCallClick }) => {
  return (
    <div className="chat-header">
      <div className="chat-header-content">
        <div className="chat-header-info">
          <div className="avatar">
            {otherUser ? otherUser.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="chat-header-text">
            <h3>{otherUser ? otherUser.charAt(0).toUpperCase() + otherUser.slice(1) : 'Loading...'}</h3>
            <span className="status">online</span>
          </div>
        </div>
        <div className="chat-header-actions">
          {otherUser && (
            <button onClick={onCallClick} className="call-button" title="Voice call">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </button>
          )}
          <button onClick={onLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;

