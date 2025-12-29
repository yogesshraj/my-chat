import React, { useRef, useState } from 'react';
import './MessageList.css';

const MessageList = ({ messages, currentUser, typing, otherUser, messagesEndRef, messageListRef, onReply, onEdit }) => {
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

  // Swipe gesture handling for mobile
  const MessageBubble = ({ msg, isOwnMessage, onReply, onEdit, currentUser, otherUser, formatTime }) => {
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const SWIPE_THRESHOLD = 50;
    const MAX_SWIPE = 80;

    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
      if (!isSwiping) return;
      
      const deltaX = e.touches[0].clientX - touchStartX.current;
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
      
      // Only allow horizontal swipe (not vertical scrolling)
      if (deltaY < 30) {
        // Swipe left to reply (for received messages)
        if (!isOwnMessage && deltaX < 0) {
          const offset = Math.max(-MAX_SWIPE, deltaX);
          setSwipeOffset(offset);
        }
        // Swipe right to reply (for sent messages)
        else if (isOwnMessage && deltaX > 0) {
          const offset = Math.min(MAX_SWIPE, deltaX);
          setSwipeOffset(offset);
        }
      }
    };

    const handleTouchEnd = () => {
      if (Math.abs(swipeOffset) >= SWIPE_THRESHOLD && onReply) {
        onReply(msg);
      }
      setSwipeOffset(0);
      setIsSwiping(false);
    };

    return (
      <div
        className="message-bubble-wrapper"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        <div className="message-bubble">
          {msg.replyTo && (
            <div className="message-reply-preview">
              <div className="reply-preview-line"></div>
              <div className="reply-preview-content">
                <div className="reply-preview-name">{msg.replyTo.from === currentUser ? 'You' : otherUser}</div>
                {msg.replyTo.fileType === 'image' ? (
                  <div className="reply-preview-text">📷 Image</div>
                ) : msg.replyTo.fileType === 'video' ? (
                  <div className="reply-preview-text">🎥 Video</div>
                ) : (
                  <div className="reply-preview-text">{msg.replyTo.message || 'Message'}</div>
                )}
              </div>
            </div>
          )}
          {msg.fileUrl && (
            <div className="message-media">
              {msg.fileType === 'image' ? (
                <img 
                  src={`https://myakka.qzz.io${msg.fileUrl}`} 
                  alt={msg.fileName || 'Image'} 
                  className="message-image"
                  loading="lazy"
                />
              ) : msg.fileType === 'video' ? (
                <video 
                  src={`https://myakka.qzz.io${msg.fileUrl}`} 
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
          <div className="message-footer">
            <div className="message-time">
              {formatTime(msg.timestamp)}
              {msg.isEdited && <span className="edited-indicator"> (edited)</span>}
            </div>
            <div className="message-actions">
              {!isOwnMessage && (
                <button 
                  className="message-action-btn" 
                  onClick={() => onReply && onReply(msg)}
                  title="Reply"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 17 4 12 9 7"></polyline>
                    <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                  </svg>
                </button>
              )}
              {isOwnMessage && (
                <>
                  <button 
                    className="message-action-btn" 
                    onClick={() => onReply && onReply(msg)}
                    title="Reply"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 17 4 12 9 7"></polyline>
                      <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                    </svg>
                  </button>
                  <button 
                    className="message-action-btn" 
                    onClick={() => onEdit && onEdit(msg)}
                    title="Edit"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="message-list" ref={messageListRef}>
      {messages.map((msg, index) => {
        // Use message id as key if available, fallback to index
        const messageKey = msg.id || `msg-${index}`;
        const isOwnMessage = msg.from === currentUser;
        const currentDateKey = getDateKey(msg.timestamp);
        const prevDateKey = index > 0 ? getDateKey(messages[index - 1].timestamp) : null;
        const showDateSeparator = currentDateKey !== prevDateKey;

        return (
          <React.Fragment key={messageKey}>
            {showDateSeparator && (
              <div className="date-separator">
                <span>{formatDate(msg.timestamp)}</span>
              </div>
            )}
            <div className={`message ${isOwnMessage ? 'message-sent' : 'message-received'}`}>
              <MessageBubble 
                msg={msg} 
                isOwnMessage={isOwnMessage} 
                onReply={onReply}
                onEdit={onEdit}
                currentUser={currentUser}
                otherUser={otherUser}
                formatTime={formatTime}
              />
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

