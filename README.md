# Nexus CRM — MERN + Material UI

A ClickUp-style CRM: JWT auth, role-based access (admin/user), boards with
fully custom fields (like ClickUp's table view), real-time chat with 1:1 and
group conversations, and voice/video calling over WebRTC signaled through
Socket.io.

> **Note on this build**: this was generated in a sandboxed environment with
> no internet access, so it has **not** been run end-to-end (`npm install`
> couldn't reach the registry, and there's no MongoDB instance available
> here). The code is complete and consistent, but budget time for the normal
> first-run debugging of any new codebase — mismatched package versions,
> environment quirks, etc.

## Stack

- **Backend**: Node.js, Express, MongoDB/Mongoose, Socket.io, JWT auth, bcrypt
- **Frontend**: React, Material UI (MUI v5), MUI X DataGrid, React Router, Socket.io-client, native WebRTC

## Features implemented

- **Auth**: signup/login with JWT. The **first user to sign up becomes admin** automatically; everyone after is a regular user.
- **Roles**: `admin` and `user`. Admins can create boards, manage all users' roles, and grant/revoke per-board access (`viewer` or `editor`).
- **Boards**: each board has its own table. Admin/editors can add **custom fields** (text, number, date, select, checkbox, url, email, currency) as new columns, alongside built-in columns (status, priority, assignees, due date). Built with MUI X DataGrid for inline editing, sorting, filtering.
- **Chat**: 1:1 direct messages and group conversations, delivered live via Socket.io, with a message history stored in MongoDB.
- **Voice & video calls**: WebRTC peer connections, signaled through Socket.io (`call:invite`, `webrtc:offer/answer/ice-candidate`). Includes ringing UI, mute/camera toggles, and call-log messages posted into the chat thread afterward.
- **Presence**: online/offline indicators via Socket.io connect/disconnect.

## Project structure

```
crm-app/
  backend/
    config/db.js            MongoDB connection
    models/                 User, Board, Card, Conversation, Message
    middleware/auth.js      JWT verification + admin guard
    routes/                 auth, users, boards, cards, conversations, messages
    socket/index.js         Socket.io: chat delivery, presence, WebRTC signaling
    server.js                Express + Socket.io entrypoint
  frontend/
    src/
      theme.js               MUI theme (design tokens)
      api/axios.js            Axios instance with JWT interceptor
      context/                AuthContext, SocketContext
      components/             Layout (sidebar/topbar), CallModal (WebRTC UI), ProtectedRoute
      pages/                  Login, Signup, BoardsList, BoardDetail, Chat, AdminPanel
```

## Setup

### 1. MongoDB

Run MongoDB locally (`mongod`) or use a free MongoDB Atlas cluster and grab its connection string.

### 2. Backend

```bash
cd backend
cp .env.example .env      # then edit MONGO_URI / JWT_SECRET as needed
npm install
npm run dev                # nodemon, http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm start                  # http://localhost:3000
```

### 4. First run

1. Go to `http://localhost:3000/signup` and create an account — this becomes the **admin**.
2. As admin, create a board (Boards → New Board), add custom fields, and add rows.
3. Sign up a second account in an incognito window (becomes a regular `user`).
4. As admin, open the board → **Access** → grant the second user `editor` or `viewer`.
5. Go to **Messages**, start a chat with that user, and try the call icons (voice/video) — grant the browser mic/camera permissions when prompted. WebRTC calling works over `localhost` without HTTPS; for calls across real networks/devices you'll want a TURN server in addition to the public STUN server already configured (`stun:stun.l.google.com:19302`), since STUN alone won't traverse all NATs.

## Extending this further

- **Group calls**: the signaling layer here is built for 1:1; extending to group calls means either a mesh of peer connections per member or routing through an SFU (e.g. mediasoup, LiveKit) — worth doing once >3-4 participants are expected.
- **File/image uploads** in chat and cards: add an S3-compatible storage bucket and a signed-upload endpoint.
- **Board views**: currently a table (DataGrid); a Kanban/board view grouped by `status` and a calendar view grouped by `dueDate` reuse the same `Card` data.
- **Notifications**: the Socket.io layer already broadcasts to each user's personal room (`socket.join(userId)`), so an in-app notification bell just needs a few more emit/listen pairs.
- **Production hardening**: rate limiting, input validation (e.g. `zod`/`joi`), refresh tokens, HTTPS + TURN server for calls, and moving secrets out of `.env` into a secret manager.
