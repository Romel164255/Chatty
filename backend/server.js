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

/* ─────────────────────────────
   App Setup
───────────────────────────── */

const app = express();
app.set("trust proxy", 1);

const server = createServer(app);

const PORT = process.env.PORT || 5000;

/* ─────────────────────────────
   Allowed Origins
───────────────────────────── */

const ALLOWED_ORIGINS = [
  "https://chatty-phi-ten.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
];

/* Allow Vercel preview deployments */
function isAllowedOrigin(origin) {

  if (!origin) return true;

  if (ALLOWED_ORIGINS.includes(origin)) return true;

  if (origin.endsWith(".vercel.app")) return true;

  return false;

}

/* ─────────────────────────────
   CORS
───────────────────────────── */

const corsOptions = {

  origin: (origin, callback) => {

    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("CORS blocked"));
    }

  },

  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization"],

  credentials: true,

};

app.use(cors(corsOptions));

/* Handle all preflight requests safely */
app.options(/.*/, cors(corsOptions));

/* ─────────────────────────────
   Middleware
───────────────────────────── */

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* ─────────────────────────────
   Routes
───────────────────────────── */

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/conversations", conversationRoutes);
app.use("/messages", messageRoutes);
app.use("/groups", groupRoutes);

/* Health check */
app.get("/", (_req, res) => {
  res.json({ status: "Chatty API running" });
});

/* 404 handler */
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* ─────────────────────────────
   Socket.IO Setup
───────────────────────────── */

const io = new Server(server, {
  cors: corsOptions,
  transports: ["websocket", "polling"],
});

/* Socket authentication */
io.use(socketAuthMiddleware);

/* Online users map */
const onlineUsers = new Map();

/* ─────────────────────────────
   Online User Helpers
───────────────────────────── */

function addOnline(userId, socketId) {

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }

  onlineUsers.get(userId).add(socketId);

}

function removeOnline(userId, socketId) {

  const sockets = onlineUsers.get(userId);

  if (!sockets) return;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(userId);
  }

}

function broadcastOnlineUsers() {
  io.emit("online_users", Array.from(onlineUsers.keys()));
}

/* ─────────────────────────────
   Socket Events
───────────────────────────── */

io.on("connection", (socket) => {

  const userId = socket.user.id;

  console.log(`Socket connected: ${socket.id} (user ${userId})`);

  addOnline(userId, socket.id);
  broadcastOnlineUsers();

  socket.on("join_conversation", (conversationId) => {

    if (!conversationId) return;

    socket.join(conversationId);

  });

  socket.on("leave_conversation", (conversationId) => {

    socket.leave(conversationId);

  });

  socket.on("send_message", (data) => {

    if (!data?.conversation_id) return;

    socket
      .to(data.conversation_id)
      .emit("receive_message", {
        ...data,
        sender_id: userId
      });

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

    socket.to(conversationId).emit("user_typing", {
      conversationId,
      userId,
      isTyping: Boolean(isTyping),
    });

  });

  socket.on("disconnect", () => {

    console.log(`Socket disconnected: ${socket.id} (user ${userId})`);

    removeOnline(userId, socket.id);
    broadcastOnlineUsers();

  });

});

/* ─────────────────────────────
   Database Check
───────────────────────────── */

async function testDB() {

  try {

    const res = await pool.query("SELECT NOW()");

    console.log("Database connected:", res.rows[0].now);

  } catch (err) {

    console.error("Database connection error:", err.message);

    process.exit(1);

  }

}

/* ─────────────────────────────
   Start Server
───────────────────────────── */

server.listen(PORT, async () => {

  console.log(`Server running on port ${PORT}`);

  await testDB();

});