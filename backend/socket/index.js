const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Maps userId -> socket.id, so we can ring a specific user for calls / DMs
const onlineUsers = new Map();

function initSocket(io) {
  // Auth middleware for socket connections (expects the JWT from login)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);
    socket.join(userId); // personal room, easy to target this user anywhere

    io.emit("presence:update", { userId, isOnline: true });

    // ---------- Chat ----------
    socket.on("conversation:join", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("conversation:leave", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Client sends after persisting via REST POST /api/messages, so all members get it live
    socket.on("message:send", ({ conversationId, message }) => {
      socket.to(`conversation:${conversationId}`).emit("message:new", message);
    });

    socket.on("typing:start", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:start", { userId, conversationId });
    });
    socket.on("typing:stop", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:stop", { userId, conversationId });
    });

    // ---------- WebRTC signaling (voice & video calls) ----------
    // callId groups a call session; targetUserId is who we're calling for 1:1,
    // or a conversationId room is used for group calls.

    socket.on("call:invite", ({ toUserId, callId, callType, conversationId, from }) => {
      const targetSocket = onlineUsers.get(toUserId);
      if (targetSocket) {
        io.to(targetSocket).emit("call:incoming", {
          callId,
          callType, // "voice" | "video"
          conversationId,
          from: from || { id: userId, name: socket.user.name, avatar: socket.user.avatar },
        });
      } else {
        socket.emit("call:unavailable", { toUserId, callId });
      }
    });

    socket.on("call:accept", ({ toUserId, callId }) => {
      const targetSocket = onlineUsers.get(toUserId);
      if (targetSocket) io.to(targetSocket).emit("call:accepted", { callId, by: userId });
    });

    socket.on("call:decline", ({ toUserId, callId }) => {
      const targetSocket = onlineUsers.get(toUserId);
      if (targetSocket) io.to(targetSocket).emit("call:declined", { callId, by: userId });
    });

    socket.on("call:end", ({ toUserId, callId }) => {
      const targetSocket = onlineUsers.get(toUserId);
      if (targetSocket) io.to(targetSocket).emit("call:ended", { callId, by: userId });
    });

    // WebRTC offer/answer/ICE relay - the actual peer-to-peer handshake payloads
    socket.on("webrtc:offer", ({ toUserId, callId, sdp }) => {
      const targetSocket = onlineUsers.get(toUserId);
      if (targetSocket) io.to(targetSocket).emit("webrtc:offer", { callId, sdp, from: userId });
    });

    socket.on("webrtc:answer", ({ toUserId, callId, sdp }) => {
      const targetSocket = onlineUsers.get(toUserId);
      if (targetSocket) io.to(targetSocket).emit("webrtc:answer", { callId, sdp, from: userId });
    });

    socket.on("webrtc:ice-candidate", ({ toUserId, callId, candidate }) => {
      const targetSocket = onlineUsers.get(toUserId);
      if (targetSocket) io.to(targetSocket).emit("webrtc:ice-candidate", { callId, candidate, from: userId });
    });

    // ---------- Disconnect ----------
    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      io.emit("presence:update", { userId, isOnline: false });
      try {
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      } catch (e) {
        /* best-effort */
      }
    });
  });
}

module.exports = { initSocket, onlineUsers };
