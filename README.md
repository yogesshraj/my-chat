# Chat App

A real-time chat application built with Node.js, Express, Socket.io, and React. Features WhatsApp-like UI with emoji support.

## Features

- Two users configured via environment variables with password authentication
- Real-time messaging using Socket.io
- WhatsApp-like user interface
- Emoji picker for messages
- Typing indicators
- Online/offline status
- Message persistence with PostgreSQL and Prisma
- Message history loading on login

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL database (running locally or remotely)

### Backend Setup

1. Navigate to the root directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   - Make sure PostgreSQL is running
   - Create a database named `my_chat_app` (or update the DATABASE_URL accordingly)

4. Create a `.env` file in the root directory:
   ```
   USER_1_NAME=user1
   USER_1_PASSWORD=password1
   USER_2_NAME=user2
   USER_2_PASSWORD=password2
   PORT=5000
   DATABASE_URL="postgresql://postgres:root@localhost:5432/my_chat_app?schema=public"
   ```
   

5. Initialize Prisma and run migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

6. Start the server:
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React app:
   ```bash
   npm start
   ```

   The app will open in your browser at `http://localhost:3000`

## Usage

1. Open the app in your browser
2. Select a user from the dropdown (users are loaded from your `.env` file)
3. Enter the corresponding password (from your `.env` file)
4. Start chatting! Open the app in two different browsers or incognito windows to test the chat between both users.

## User Configuration

Users are configured via environment variables in your `.env` file:
- `USER_1_NAME` and `USER_1_PASSWORD` for the first user
- `USER_2_NAME` and `USER_2_PASSWORD` for the second user

## Project Structure

```
.
├── server.js              # Express server with Socket.io
├── package.json           # Backend dependencies
├── prisma/
│   └── schema.prisma      # Prisma schema for database
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.js         # Main app component
│   │   └── index.js       # Entry point
│   └── package.json       # Frontend dependencies
└── README.md
```

## Database

The app uses PostgreSQL with Prisma ORM. Messages are automatically saved to the database and loaded when users log in. The last 50 messages are loaded for each conversation.

### Prisma Commands

- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio to view/edit database

