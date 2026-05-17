import { useEffect, useRef, useState, useCallback } from "react";
import api from "../services/api";
import { getSocket } from "../services/socket";
import { decryptMessage } from "../utils/crypto";

function getMyId() {
  try {
    return JSON.parse(atob(localStorage.getItem("token").split(".")[1])).id;
  } catch {
    return null;
  }
}

/** Render a single message bubble's content */
function MessageContent({ content }) {
  // Audio messages are stored as "audio:<cloudinary-url>"
  if (typeof content === "string" && content.startsWith("audio:")) {
    const url = content.slice(6);
    return (
      <audio
        controls
        src={url}
        style={{ maxWidth: "100%", minWidth: 220, outline: "none" }}
      />
    );
  }
  return <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{content}</span>;
}

export default function MessageList({ conversationId }) {
  const [messages, setMessages] = useState([]);
  const myId = getMyId();
  const bottomRef = useRef();

  /**
   * Decrypt a list of raw DB message rows.
   *
   * Rows that have no `iv` (e.g. audio messages uploaded via /audio/upload)
   * are stored as plaintext and are returned as-is.
   * Rows whose decryption fails (e.g. messages from before encryption was
   * added) show a lock indicator instead of crashing.
   */
  async function decryptMessages(list) {
    return Promise.all(
      list.map(async msg => {
        // No iv → plaintext row (audio or legacy message)
        if (!msg.iv) return msg;

        try {
          const content = await decryptMessage(msg.content, msg.iv, conversationId);
          return { ...msg, content };
        } catch {
          return { ...msg, content: "🔒 Encrypted message" };
        }
      })
    );
  }

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/messages/${conversationId}`);
      const decrypted = await decryptMessages(res.data);
      setMessages(decrypted);
    } catch (err) {
      console.error(err);
    }
  }, [conversationId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit("join_conversation", conversationId);

    async function onMessage(data) {
      if (data.conversation_id !== conversationId) return;

      if (data.iv) {
        try {
          data.content = await decryptMessage(data.content, data.iv, conversationId);
        } catch {
          data.content = "🔒 Encrypted";
        }
      }
      // no iv → plaintext (audio), show as-is

      setMessages(prev => [...prev, data]);
    }

    socket.on("receive_message", onMessage);
    return () => socket.off("receive_message", onMessage);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={s.list}>
      {messages.map(msg => {
        const isMine = msg.sender_id === myId;
        return (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: isMine ? "flex-end" : "flex-start",
              marginBottom: 2,
            }}
          >
            <div style={{ ...s.bubble, ...(isMine ? s.bubbleMe : s.bubbleThem) }}>
              {/* Sender name in group chats for other people's messages */}
              {!isMine && msg.sender_name && (
                <div style={s.senderName}>{msg.sender_name}</div>
              )}

              <MessageContent content={msg.content} />

              <div style={s.timestamp}>
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

const s = {
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
  },
  bubble: {
    padding: "9px 13px",
    margin: "3px 0",
    borderRadius: "var(--radius-bubble)",
    maxWidth: "70%",
    // Explicit text color so it's never affected by stray browser defaults
    color: "var(--text-primary)",
    fontSize: 14,
    lineHeight: 1.5,
  },
  // "My" bubbles — uses the theme gradient defined in index.css
  bubbleMe: {
    background: "var(--bg-bubble-me)",
    borderBottomRightRadius: 4,
  },
  // "Their" bubbles
  bubbleThem: {
    background: "var(--bg-bubble-them)",
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 11.5,
    fontWeight: 600,
    color: "var(--accent2)",
    marginBottom: 3,
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.55,
    textAlign: "right",
    marginTop: 4,
    color: "var(--text-primary)",
  },
};
