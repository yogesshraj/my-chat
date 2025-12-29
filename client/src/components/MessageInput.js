import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import './MessageInput.css';

const MessageInput = ({ onSendMessage, onTyping, replyTo, onCancelReply, editMessage, onCancelEdit }) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Set message when editing
  useEffect(() => {
    if (editMessage) {
      setMessage(editMessage.message || '');
    }
  }, [editMessage]);

  // Compress large images client-side (keep high quality)
  const compressImage = (file) => {
    const MAX_DIMENSION = 1920; // px
    const QUALITY = 0.9; // high quality

    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          let { width, height } = img;

          if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
            // No need to resize
            return resolve(file);
          }

          if (width > height) {
            height = (height * MAX_DIMENSION) / width;
            width = MAX_DIMENSION;
          } else {
            width = (width * MAX_DIMENSION) / height;
            height = MAX_DIMENSION;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Image compression failed'));
              }
              const compressedFile = new File([blob], file.name, {
                type: blob.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            QUALITY
          );
        };
        img.onerror = reject;
        img.src = e.target.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicator
    if (value && !isTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping(false);
    }, 1000);
  };

  const handleSend = async (fileData = null) => {
    if (message.trim() || fileData) {
      onSendMessage(message, fileData);
      setMessage('');
      setIsTyping(false);
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleFileSelect = async (e) => {
    let file = e.target.files[0];
    if (!file) return;

    try {
      // If it's an image and very large, compress client-side first
      if (file.type.startsWith('image/') && file.size > 5 * 1024 * 1024) {
        file = await compressImage(file);
      }

      // Final safety limit (50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('File is too large even after compression (max 50MB).');
        return;
      }
    } catch (err) {
      console.error('Error compressing image:', err);
      alert('Failed to process image. Please try a smaller file.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('https://myakka.qzz.io/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const fileData = {
        fileUrl: response.data.fileUrl,
        fileType: response.data.fileType,
        fileName: response.data.fileName
      };

      await handleSend(fileData);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="message-input-container">
      {showEmojiPicker && (
        <div className="emoji-picker-wrapper">
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}
      {uploading && (
        <div className="uploading-indicator">Uploading...</div>
      )}
      {(replyTo || editMessage) && (
        <div className="input-preview">
          <div className="preview-content">
            {replyTo && (
              <>
                <div className="preview-label">Replying to {replyTo.from === 'You' ? 'yourself' : replyTo.from}</div>
                <div className="preview-text">
                  {replyTo.fileType === 'image' ? '📷 Image' : 
                   replyTo.fileType === 'video' ? '🎥 Video' : 
                   replyTo.message || 'Message'}
                </div>
              </>
            )}
            {editMessage && (
              <>
                <div className="preview-label">Editing message</div>
                <div className="preview-text">{editMessage.message || 'Message'}</div>
              </>
            )}
          </div>
          <button 
            className="preview-close" 
            onClick={() => {
              if (replyTo && onCancelReply) onCancelReply();
              if (editMessage && onCancelEdit) onCancelEdit();
            }}
          >
            ✕
          </button>
        </div>
      )}
      <div className="message-input-box">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*"
          style={{ display: 'none' }}
          id="file-input"
        />
        <label htmlFor="file-input" className="attach-button" title="Attach file">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
          </svg>
        </label>
        <button
          className="emoji-button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          type="button"
        >
          😊
        </button>
        <input
          type="text"
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message"
          className="message-input"
          disabled={uploading}
        />
        <button
          className="send-button"
          onClick={() => handleSend()}
          disabled={!message.trim() || uploading}
          type="button"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MessageInput;

