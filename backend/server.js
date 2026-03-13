import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import { pool } from "./db.js";
import { socketAuthMiddleware } from "./middleware/authMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// Hardcode your Vercel URL here so it ALWAYS works regardless of env vars
const ALLOWED = [
  "https://chatty-phi-ten.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
];

// Also accept whatever is in CLIENT_ORIGIN env var (in case URL changes)
if (process.env.CLIENT_ORIGIN && !ALLOWED.includes(process.env.CLIENT_ORIGIN)) {
  ALLOWED.push(process.env.CLIENT_ORIGIN);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    if (ALLOWED.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.options("*", cors(corsOptions)); // handle all preflight requests
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/conversations", conversationRoutes);
app.use("/messages", messageRoutes);
app.use("/groups", groupRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: corsOptions,
  transports: ["polling", "websocket"],
});

io.use(socketAuthMiddleware);

const onlineUsers = new Map();

function addOnline(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}
function removeOnline(userId, socketId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) onlineUsers.delete(userId);
}
function broadcastOnlineUsers() {
  io.emit("online_users", Array.from(onlineUsers.keys()));
}

io.on("connection", (socket) => {
  const userId = socket.user.id;
  console.log(`[socket] connected: ${socket.id} (user ${userId})`);
  addOnline(userId, socket.id);
  broadcastOnlineUsers();

  socket.on("join_conversation", (conversationId) => {
    if (typeof conversationId !== "string") return;
    socket.join(conversationId);
  });

  socket.on("leave_conversation", (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on("send_message", (data) => {
    if (!data || typeof data.conversation_id !== "string") return;
    socket.to(data.conversation_id).emit("receive_message", { ...data, sender_id: userId });
  });

  socket.on("message_delivered", ({ message_id, conversationId }) => {
    if (!message_id || !conversationId) return;
    io.to(conversationId).emit("message_delivered", { message_id });
  });

  socket.on("message_read", ({ message_id, conversationId }) => {
    if (!message_id || !conversationId) return;
    io.to(conversationId).emit("message_read", { message_id });
  });

  socket.on("typing", ({ conversationId, isTyping }) => {
    if (!conversationId) return;
    socket.to(conversationId).emit("user_typing", { conversationId, userId, isTyping: Boolean(isTyping) });
  });

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected: ${socket.id} (user ${userId})`);
    removeOnline(userId, socket.id);
    broadcastOnlineUsers();
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function testDB() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Database connected:", res.rows[0].now);
  } catch (err) {
    console.error("Database connection error:", err.message);
    process.exit(1);
  }
}

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await testDB();
});
