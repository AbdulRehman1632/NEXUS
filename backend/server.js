require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const { initSocket } = require("./socket");
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Google Public DNS

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const boardRoutes = require("./routes/boardRoutes");
const cardRoutes = require("./routes/cardRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");

connectDB();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

// Central error handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : err.status || 500;
  res.status(statusCode).json({
    message: err.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "*", methods: ["GET", "POST"] },
});
initSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
