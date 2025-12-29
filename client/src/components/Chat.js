import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import IncomingCallModal from './IncomingCallModal';
import ActiveCallScreen from './ActiveCallScreen';
import CallingScreen from './CallingScreen';
import './Chat.css';

const Chat = ({ user, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  
  // Call state
  const [callState, setCallState] = useState(null); // 'incoming', 'calling', 'active', null
  const [incomingCaller, setIncomingCaller] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user1Name, setUser1Name] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editMessage, setEditMessage] = useState(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingOfferRef = useRef(null);

  useEffect(() => {
    // Get USER_1_NAME for notification checks
    axios.get('https://myakka.qzz.io/api/user1-name')
      .then(res => {
        setUser1Name(res.data.user1Name);
      })
      .catch(err => console.error('Error fetching USER_1_NAME:', err));

    // Get the other user
    axios.get('/api/users')
      .then(res => {
        const users = res.data;
        const other = users.find(u => u !== user);
        setOtherUser(other);
      });

    // Initialize socket connection
    const newSocket = io('https://myakka.qzz.io', {
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    // Wait for connection before logging in
    newSocket.on('connect', () => {
      console.log('Socket connected, logging in as:', user);
      newSocket.emit('login', user);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Listen for login confirmation via userStatus event
    newSocket.on('userStatus', (data) => {
      if (data.username === user && data.status === 'online') {
        console.log('Login confirmed for:', user);
        setIsLoggedIn(true);
      }
    });

    // Listen for messages
    newSocket.on('receiveMessage', (message) => {
      setMessages(prev => {
        // Check if message already exists (update instead of add)
        const existingIndex = prev.findIndex(m => m.id === message.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = message;
          return updated;
        }
        return [...prev, message];
      });
    });

    // Listen for edited messages
    newSocket.on('messageEdited', (message) => {
      setMessages(prev => {
        const index = prev.findIndex(m => m.id === message.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = message;
          return updated;
        }
        return prev;
      });
    });

    // Listen for notifications (only USER_1_NAME receives these)
    newSocket.on('new-message-notification', (data) => {
      // Double check: only show if current user is USER_1_NAME
      if (user === user1Name) {
        showNotification(data.from, data.message, data.fileType);
      }
    });

    // Listen for typing indicator
    newSocket.on('typing', (data) => {
      setTyping(data.isTyping);
    });

    // Listen for message history
    newSocket.on('messageHistory', (history) => {
      setMessages(history);
    });

    // Call event handlers
    newSocket.on('incoming-call', (data) => {
      console.log('Incoming call received from:', data.from);
      console.log('Setting callState to incoming, incomingCaller to:', data.from);
      if (data.from) {
        setIncomingCaller(data.from);
        setCallState('incoming');
      } else {
        console.error('Incoming call data missing from field:', data);
      }
    });

    newSocket.on('call-answered', (data) => {
      // When the other user answers, set call to active
      console.log('Call answered by:', data.from);
      setCallState(prevState => {
        if (prevState === 'calling') {
          return 'active';
        }
        return prevState;
      });
    });

    newSocket.on('call-rejected', (data) => {
      setCallState(null);
      setIncomingCaller(null);
      endCall();
    });

    newSocket.on('call-ended', (data) => {
      setCallState(null);
      setIncomingCaller(null);
      endCall();
    });

    newSocket.on('call-offer', async (data) => {
      console.log('Received call offer:', data);
      const caller = data.from || incomingCaller;
      console.log('Caller:', caller, 'IncomingCaller state:', incomingCaller);
      
      // Update incomingCaller if we got it from the offer
      if (data.from && !incomingCaller) {
        setIncomingCaller(data.from);
      }
      
      if (peerConnectionRef.current) {
        try {
          console.log('Setting remote description...');
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          console.log('Creating answer...');
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          console.log('Sending answer back to:', caller);
          if (newSocket && caller) {
            newSocket.emit('call-answer-webrtc', {
              to: caller,
              answer: answer
            });
          }
        } catch (error) {
          console.error('Error handling call offer:', error);
        }
      } else {
        console.log('Peer connection not ready, storing offer and caller:', caller);
        // Store offer with caller info if peer connection not ready yet
        pendingOfferRef.current = {
          offer: data.offer,
          from: caller
        };
      }
    });

    newSocket.on('call-answer-webrtc', async (data) => {
      console.log('Received call answer from:', data.from);
      if (peerConnectionRef.current) {
        try {
          console.log('Setting remote description (answer)...');
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log('Remote description set successfully');
        } catch (error) {
          console.error('Error setting remote description (answer):', error);
        }
      }
    });

    newSocket.on('ice-candidate', async (data) => {
      console.log('Received ICE candidate from:', data.from);
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('ICE candidate added successfully');
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    return () => {
      newSocket.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  const scrollToBottom = () => {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      } else if (messageListRef.current) {
        // Fallback: scroll the container directly
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      }
    }, 100);
  };

  const sendMessage = (messageText, fileData = null, replyToId = null, editMessageId = null) => {
    if (socket && otherUser && (messageText.trim() || fileData)) {
      if (editMessageId) {
        // Edit existing message
        socket.emit('editMessage', {
          messageId: editMessageId,
          newMessage: messageText
        });
        setEditMessage(null);
      } else {
        // Send new message or reply
        socket.emit('sendMessage', {
          from: user,
          to: otherUser,
          message: messageText || '',
          fileUrl: fileData?.fileUrl || null,
          fileType: fileData?.fileType || null,
          fileName: fileData?.fileName || null,
          replyToId: replyToId
        });
        if (replyTo) {
          setReplyTo(null);
        }
      }
    }
  };

  const handleTyping = (isTyping) => {
    if (socket && otherUser) {
      socket.emit('typing', {
        to: otherUser,
        isTyping
      });
    }
  };

  // Notification function
  const showNotification = (from, message, fileType) => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        const title = `New message from ${from}`;
        const body = fileType === 'image' ? '📷 Sent an image' : 
                     fileType === 'video' ? '🎥 Sent a video' : 
                     message || 'New message';
        
        new Notification(title, {
          body: body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `message-${from}-${Date.now()}`
        });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            showNotification(from, message, fileType);
          }
        });
      }
    }
  };

  // Request notification permission on mount (only for USER_1_NAME)
  useEffect(() => {
    if (user === user1Name && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user, user1Name]);

  // WebRTC Call Functions
  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Free TURN servers (for NAT traversal in AWS/cloud environments)
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10
    };

    const pc = new RTCPeerConnection(configuration);

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind, event.track);
      console.log('Remote streams:', event.streams);
      if (event.streams && event.streams.length > 0) {
        const remoteStream = event.streams[0];
        console.log('Remote stream tracks:', remoteStream.getTracks());
        
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          
          // Force play the audio
          remoteAudioRef.current.play()
            .then(() => {
              console.log('Remote audio playing successfully');
              console.log('Audio element volume:', remoteAudioRef.current.volume);
              console.log('Audio element muted:', remoteAudioRef.current.muted);
            })
            .catch(err => {
              console.error('Error playing remote audio:', err);
              // Try again after a short delay
              setTimeout(() => {
                remoteAudioRef.current?.play().catch(e => {
                  console.error('Retry play failed:', e);
                });
              }, 500);
            });
        } else {
          console.error('Remote audio element not found!');
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Peer connection state:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.error('Peer connection failed. Attempting to restart...');
        // Could implement reconnection logic here
      }
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && otherUser) {
        console.log('Sending ICE candidate');
        socket.emit('ice-candidate', {
          to: otherUser,
          candidate: event.candidate
        });
      } else if (!event.candidate) {
        console.log('All ICE candidates have been sent');
      }
    };

    return pc;
  };

  const startCall = async (isAnswering = false) => {
    try {
      // Get user media with better constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }, 
        video: false 
      });
      localStreamRef.current = stream;
      console.log('Got local media stream:', stream.getTracks());

      // Create remote audio element with better settings
      if (!remoteAudioRef.current) {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.playsInline = true;
        audio.style.display = 'none';
        audio.volume = 1.0;
        audio.muted = false;
        
        // Add event listeners for debugging
        audio.addEventListener('loadedmetadata', () => {
          console.log('Audio metadata loaded');
        });
        audio.addEventListener('canplay', () => {
          console.log('Audio can play');
        });
        audio.addEventListener('play', () => {
          console.log('Audio started playing');
        });
        audio.addEventListener('error', (e) => {
          console.error('Audio element error:', e);
        });
        
        document.body.appendChild(audio);
        remoteAudioRef.current = audio;
        console.log('Created remote audio element');
      }

      // Create peer connection
      peerConnectionRef.current = createPeerConnection();

      if (!isAnswering) {
        // Create offer for outgoing call
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        
        if (socket && otherUser) {
          socket.emit('call-offer', {
            to: otherUser,
            offer: offer
          });
        }
        // Don't set callState to 'active' here - wait for answer
      } else {
        // For answering, check if we have a pending offer
        if (pendingOfferRef.current) {
          try {
            console.log('Handling pending offer...');
            const offer = typeof pendingOfferRef.current === 'object' && pendingOfferRef.current.offer 
              ? pendingOfferRef.current.offer 
              : pendingOfferRef.current;
            
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            
            const caller = incomingCaller || (typeof pendingOfferRef.current === 'object' ? pendingOfferRef.current.from : null);
            console.log('Answer created and set, sending to:', caller);
            
            if (socket && caller) {
              socket.emit('call-answer-webrtc', {
                to: caller,
                answer: answer
              });
            }
            pendingOfferRef.current = null;
          } catch (error) {
            console.error('Error handling pending offer:', error);
          }
        } else {
          console.log('No pending offer found when answering call');
        }
      }
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Failed to start call. Please check microphone permissions.');
      endCall();
    }
  };

  const endCall = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Remove remote audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      if (remoteAudioRef.current.parentNode) {
        remoteAudioRef.current.parentNode.removeChild(remoteAudioRef.current);
      }
      remoteAudioRef.current = null;
    }

    setCallState(null);
    setIncomingCaller(null);
    setIsMuted(false);

    if (socket && otherUser && callState === 'active') {
      socket.emit('call-end', { to: otherUser });
    }
  };

  const handleCallClick = async () => {
    if (!socket) {
      console.error('Socket not initialized');
      alert('Connection not ready. Please wait...');
      return;
    }
    
    if (!socket.connected) {
      console.error('Socket not connected');
      alert('Connection lost. Please refresh the page.');
      return;
    }
    
    if (!isLoggedIn) {
      console.error('Not logged in yet');
      alert('Please wait for connection to be established...');
      return;
    }
    
    if (!otherUser) {
      console.error('Other user not found');
      return;
    }
    
    if (callState) {
      console.log('Call already in progress');
      return;
    }
    
    console.log('Initiating call to:', otherUser);
    console.log('Current user:', user);
    console.log('Socket connected:', socket.connected);
    console.log('Socket ID:', socket.id);
    console.log('Is logged in:', isLoggedIn);
    
    // Emit call initiate first
    socket.emit('call-initiate', { to: otherUser, callType: 'audio' });
    // Set state to calling (waiting for answer)
    setCallState('calling');
    // Start the call setup
    await startCall(false);
  };

  const handleAnswerCall = async () => {
    if (socket && incomingCaller) {
      console.log('Answering call from:', incomingCaller);
      socket.emit('call-answer', { to: incomingCaller });
      setCallState('active');
      // Start call first, then it will handle the pending offer
      await startCall(true);
    } else {
      console.error('Cannot answer call:', { socket: !!socket, incomingCaller });
    }
  };

  const handleRejectCall = () => {
    if (socket && incomingCaller) {
      socket.emit('call-reject', { to: incomingCaller });
      setCallState(null);
      setIncomingCaller(null);
    }
  };

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Debug: Log current state (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Current callState:', callState, 'incomingCaller:', incomingCaller);
  }

  return (
    <div className="chat-container">
      {callState === 'incoming' && (
        <IncomingCallModal
          caller={incomingCaller}
          onAnswer={handleAnswerCall}
          onReject={handleRejectCall}
        />
      )}
      {callState === 'calling' && (
        <CallingScreen
          otherUser={otherUser}
          onCancelCall={endCall}
        />
      )}
      {callState === 'active' && (
        <ActiveCallScreen
          otherUser={otherUser}
          onEndCall={endCall}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
        />
      )}
      {!callState && (
        <>
          <ChatHeader 
            user={user} 
            otherUser={otherUser} 
            onLogout={onLogout}
            onCallClick={handleCallClick}
          />
                      <MessageList
                        messages={messages}
                        currentUser={user}
                        typing={typing}
                        otherUser={otherUser}
                        messagesEndRef={messagesEndRef}
                        messageListRef={messageListRef}
                        onReply={(msg) => setReplyTo(msg)}
                        onEdit={(msg) => {
                          if (msg.from === user) {
                            setEditMessage(msg);
                            setReplyTo(null);
                          }
                        }}
                      />
                      <MessageInput
                        onSendMessage={sendMessage}
                        onTyping={handleTyping}
                        replyTo={replyTo}
                        onCancelReply={() => setReplyTo(null)}
                        editMessage={editMessage}
                        onCancelEdit={() => setEditMessage(null)}
                      />
        </>
      )}
    </div>
  );
};

export default Chat;

