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

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to compare only dates
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (messageDate.getTime() === todayDate.getTime()) {
      return 'Today';
    } else if (messageDate.getTime() === yesterdayDate.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getDateKey = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  return (
    <div className="message-list" ref={messageListRef}>
      {messages.map((msg, index) => {
        const isOwnMessage = msg.from === currentUser;
        const currentDateKey = getDateKey(msg.timestamp);
        const prevDateKey = index > 0 ? getDateKey(messages[index - 1].timestamp) : null;
        const showDateSeparator = currentDateKey !== prevDateKey;

        return (
          <React.Fragment key={index}>
            {showDateSeparator && (
              <div className="date-separator">
                <span>{formatDate(msg.timestamp)}</span>
              </div>
            )}
            <div className={`message ${isOwnMessage ? 'message-sent' : 'message-received'}`}>
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
          </React.Fragment>
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

