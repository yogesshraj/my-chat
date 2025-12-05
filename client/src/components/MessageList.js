import React from 'react';
import './MessageList.css';

const MessageList = ({ messages, currentUser, typing, otherUser, messagesEndRef, messageListRef }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="message-list" ref={messageListRef}>
      {messages.map((msg, index) => {
        const isOwnMessage = msg.from === currentUser;
        return (
          <div
            key={index}
            className={`message ${isOwnMessage ? 'message-sent' : 'message-received'}`}
          >
            <div className="message-bubble">
              {msg.fileUrl && (
                <div className="message-media">
                  {msg.fileType === 'image' ? (
                    <img 
                      src={`https://myakka.qzz.io/uploads/${msg.fileUrl}`} 
                      alt={msg.fileName || 'Image'} 
                      className="message-image"
                      loading="lazy"
                    />
                  ) : msg.fileType === 'video' ? (
                    <video 
                      src={`https://myakka.qzz.io/uploads/${msg.fileUrl}`} 
                      controls
                      className="message-video"
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : null}
                </div>
              )}
              {msg.message && (
                <div className="message-text">{msg.message}</div>
              )}
              <div className="message-time">{formatTime(msg.timestamp)}</div>
            </div>
          </div>
        );
      })}
      {typing && (
        <div className="message message-received">
          <div className="message-bubble typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;

