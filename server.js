const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed!'));
    }
  }
});

// Build users from environment variables
const user1Name = process.env.USER_1_NAME;
const user1Password = process.env.USER_1_PASSWORD;
const user2Name = process.env.USER_2_NAME;
const user2Password = process.env.USER_2_PASSWORD;

if (!user1Name || !user1Password || !user2Name || !user2Password) {
  console.error('Error: Missing required environment variables for users.');
  console.error('Required: USER_1_NAME, USER_1_PASSWORD, USER_2_NAME, USER_2_PASSWORD');
  process.exit(1);
}

// Build users object dynamically from environment variables
const users = {
  [user1Name]: {
    name: user1Name,
    password: user1Password
  },
  [user2Name]: {
    name: user2Name,
    password: user2Password
  }
};

// Store active users
const activeUsers = new Map();

// Authentication endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!users[username]) {
    return res.status(401).json({ error: 'Invalid username' });
  }
  
  if (users[username].password !== password) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  res.json({ success: true, username });
});

// Get all users (for chat list)
app.get('/api/users', (req, res) => {
  res.json(Object.keys(users));
});

// Get user info (for login dropdown)
app.get('/api/users/info', (req, res) => {
  const userList = Object.keys(users).map(username => ({
    username,
    displayName: username.charAt(0).toUpperCase() + username.slice(1)
  }));
  res.json(userList);
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
  
  res.json({
    fileUrl: `/uploads/${req.file.filename}`,
    fileType: fileType,
    fileName: req.file.originalname
  });
});

// Get message history between two users
app.get('/api/messages', async (req, res) => {
  try {
    const { user1, user2 } = req.query;
    
    if (!user1 || !user2) {
      return res.status(400).json({ error: 'Both user1 and user2 are required' });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromUser: user1, toUser: user2 },
          { fromUser: user2, toUser: user1 }
        ]
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      from: msg.fromUser,
      to: msg.toUser,
      message: msg.message,
      fileUrl: msg.fileUrl,
      fileType: msg.fileType,
      fileName: msg.fileName,
      timestamp: msg.createdAt.toISOString()
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user login
  socket.on('login', async (username) => {
    activeUsers.set(socket.id, username);
    socket.username = username;
    io.emit('userStatus', { username, status: 'online' });
    console.log(`${username} logged in`);

    // Load message history for this user with the other user
    try {
      const otherUser = Object.keys(users).find(u => u !== username);
      if (otherUser) {
        const messages = await prisma.message.findMany({
          where: {
            OR: [
              { fromUser: username, toUser: otherUser },
              { fromUser: otherUser, toUser: username }
            ]
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 50 // Load last 50 messages
        });

        // Reverse to get chronological order
        messages.reverse();

        // Send message history to the client
        const formattedMessages = messages.map(msg => ({
          from: msg.fromUser,
          to: msg.toUser,
          message: msg.message,
          fileUrl: msg.fileUrl,
          fileType: msg.fileType,
          fileName: msg.fileName,
          timestamp: msg.createdAt.toISOString()
        }));

        socket.emit('messageHistory', formattedMessages);
      }
    } catch (error) {
      console.error('Error loading message history:', error);
    }
  });

  // Handle sending messages
  socket.on('sendMessage', async (data) => {
    try {
      const fromUser = socket.username || data.from || 'unknown';

      // Save message to database
      const savedMessage = await prisma.message.create({
        data: {
          fromUser,
          toUser: data.to,
          message: data.message || '',
          fileUrl: data.fileUrl || null,
          fileType: data.fileType || null,
          fileName: data.fileName || null
        }
      });

      const message = {
        from: savedMessage.fromUser,
        to: savedMessage.toUser,
        message: savedMessage.message,
        fileUrl: savedMessage.fileUrl,
        fileType: savedMessage.fileType,
        fileName: savedMessage.fileName,
        timestamp: savedMessage.createdAt.toISOString()
      };
      
      // Find the recipient's socket
      const recipientSocket = Array.from(activeUsers.entries())
        .find(([id, username]) => username === data.to)?.[0];
      
      if (recipientSocket) {
        io.to(recipientSocket).emit('receiveMessage', message);
      }
      
      // Also send back to sender for confirmation
      socket.emit('receiveMessage', message);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const recipientSocket = Array.from(activeUsers.entries())
      .find(([id, username]) => username === data.to)?.[0];
    
    if (recipientSocket) {
      io.to(recipientSocket).emit('typing', {
        from: socket.username,
        isTyping: data.isTyping
      });
    }
  });

  // Handle call initiation
  socket.on('call-initiate', (data) => {
    if (!socket.username) {
      console.log('Call initiated but socket not logged in yet');
      return;
    }
    
    console.log(`Call initiated from ${socket.username} to ${data.to}`);
    console.log('Active users:', Array.from(activeUsers.entries()));
    
    const recipientSocket = Array.from(activeUsers.entries())
      .find(([id, username]) => username === data.to)?.[0];
    
    if (recipientSocket) {
      console.log(`Sending incoming-call to ${data.to} (socket: ${recipientSocket})`);
      io.to(recipientSocket).emit('incoming-call', {
        from: socket.username,
        callType: data.callType || 'audio'
      });
    } else {
      console.log(`Recipient ${data.to} not found or not online. Available users:`, Array.from(activeUsers.values()));
    }
  });

  // Handle call answer
  socket.on('call-answer', (data) => {
    const recipientSocket = Array.from(activeUsers.entries())
      .find(([id, username]) => username === data.to)?.[0];
    
    if (recipientSocket) {
      io.to(recipientSocket).emit('call-answered', {
        from: socket.username
      });
    }
  });

  // Handle call reject
  socket.on('call-reject', (data) => {
    const recipientSocket = Array.from(activeUsers.entries())
      .find(([id, username]) => username === data.to)?.[0];
    
    if (recipientSocket) {
      io.to(recipientSocket).emit('call-rejected', {
        from: socket.username
      });
    }
  });

  // Handle call end
  socket.on('call-end', (data) => {
    const recipientSocket = Array.from(activeUsers.entries())
      .find(([id, username]) => username === data.to)?.[0];
    
    if (recipientSocket) {
      io.to(recipientSocket).emit('call-ended', {
        from: socket.username
      });
    }
  });

  // Handle WebRTC offer
  socket.on('call-offer', (data) => {
    const recipientSocket = Array.from(activeUsers.entries())
      .find(([id, username]) => username === data.to)?.[0];
    
    if (recipientSocket) {
      io.to(recipientSocket).emit('call-offer', {
        from: socket.username,
        offer: data.offer
      });
    }
  });

  // Handle WebRTC answer
  socket.on('call-answer-webrtc', (data) => {
    const recipientSocket = Array.from(activeUsers.entries())
      .find(([id, username]) => username === data.to)?.[0];
    
    if (recipientSocket) {
      io.to(recipientSocket).emit('call-answer-webrtc', {
        from: socket.username,
        answer: data.answer
      });
    }
  });

  // Handle ICE candidate
  socket.on('ice-candidate', (data) => {
    const recipientSocket = Array.from(activeUsers.entries())
      .find(([id, username]) => username === data.to)?.[0];
    
    if (recipientSocket) {
      io.to(recipientSocket).emit('ice-candidate', {
        from: socket.username,
        candidate: data.candidate
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.username) {
      io.emit('userStatus', { username: socket.username, status: 'offline' });
      activeUsers.delete(socket.id);
      console.log(`${socket.username} disconnected`);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test database connection
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

