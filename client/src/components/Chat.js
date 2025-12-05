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
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingOfferRef = useRef(null);

  useEffect(() => {
    // Get the other user
    axios.get('/api/users')
      .then(res => {
        const users = res.data;
        const other = users.find(u => u !== user);
        setOtherUser(other);
      });

    // Initialize socket connection
    const newSocket = io('https://myakka.qzz.io');
    setSocket(newSocket);

    // Login to socket
    newSocket.emit('login', user);

    // Listen for messages
    newSocket.on('receiveMessage', (message) => {
      setMessages(prev => [...prev, message]);
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
      setIncomingCaller(data.from);
      setCallState('incoming');
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
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          if (newSocket) {
            newSocket.emit('call-answer-webrtc', {
              to: data.from,
              answer: answer
            });
          }
        } catch (error) {
          console.error('Error handling call offer:', error);
        }
      } else {
        // Store offer if peer connection not ready yet
        pendingOfferRef.current = data.offer;
      }
    });

    newSocket.on('call-answer-webrtc', async (data) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    newSocket.on('ice-candidate', async (data) => {
      if (peerConnectionRef.current && data.candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    return () => {
      newSocket.close();
      endCall();
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

  const sendMessage = (messageText, fileData = null) => {
    if (socket && otherUser && (messageText.trim() || fileData)) {
      socket.emit('sendMessage', {
        from: user,
        to: otherUser,
        message: messageText || '',
        fileUrl: fileData?.fileUrl || null,
        fileType: fileData?.fileType || null,
        fileName: fileData?.fileName || null
      });
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

  // WebRTC Call Functions
  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
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
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && otherUser) {
        socket.emit('ice-candidate', {
          to: otherUser,
          candidate: event.candidate
        });
      }
    };

    return pc;
  };

  const startCall = async (isAnswering = false) => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      localStreamRef.current = stream;

      // Create remote audio element
      if (!remoteAudioRef.current) {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.style.display = 'none';
        document.body.appendChild(audio);
        remoteAudioRef.current = audio;
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
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            if (socket && incomingCaller) {
              socket.emit('call-answer-webrtc', {
                to: incomingCaller,
                answer: answer
              });
            }
            pendingOfferRef.current = null;
          } catch (error) {
            console.error('Error handling pending offer:', error);
          }
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
    if (socket && otherUser && !callState) {
      console.log('Initiating call to:', otherUser);
      console.log('Current user:', user);
      console.log('Socket connected:', socket.connected);
      // Emit call initiate first
      socket.emit('call-initiate', { to: otherUser, callType: 'audio' });
      // Set state to calling (waiting for answer)
      setCallState('calling');
      // Start the call setup
      await startCall(false);
    } else {
      console.log('Cannot call:', { socket: !!socket, otherUser, callState });
    }
  };

  const handleAnswerCall = async () => {
    if (socket && incomingCaller) {
      socket.emit('call-answer', { to: incomingCaller });
      setCallState('active');
      await startCall(true);
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
          />
          <MessageInput 
            onSendMessage={sendMessage} 
            onTyping={handleTyping}
          />
        </>
      )}
    </div>
  );
};

export default Chat;

