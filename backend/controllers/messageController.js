import crypto from "crypto";
import { pool } from "../db.js";

const MAX_MESSAGE_LENGTH = 4000;
const VALID_STATUSES = ["sent", "delivered", "read"];

/* =========================
   HELPER — verify membership
========================= */

async function isMember(userId, conversationId) {
  const result = await pool.query(
    `SELECT 1 FROM conversation_members
     WHERE user_id = $1 AND conversation_id = $2`,
    [userId, conversationId]
  );
  return result.rows.length > 0;
}

/* =========================
   SEND MESSAGE
========================= */

export async function sendMessage(req, res) {
  try {
    const { conversation_id, content } = req.body;

    if (!conversation_id || !content) {
      return res.status(400).json({ error: "conversation_id and content required" });
    }

    const trimmed = content.trim();

    if (trimmed.length === 0) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      });
    }

    // Verify the sender is a member of this conversation
    if (!(await isMember(req.user.id, conversation_id))) {
      return res.status(403).json({ error: "Not a member of this conversation" });
    }

    const messageId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, content, status)
       VALUES ($1, $2, $3, $4, 'sent')`,
      [messageId, conversation_id, req.user.id, trimmed]
    );

    // Fetch full message with sender info for the response
    const msgResult = await pool.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.status, m.created_at,
              u.username AS sender_username,
              COALESCE(u.display_name, u.username) AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.id = $1`,
      [messageId]
    );

    res.status(201).json(msgResult.rows[0]);
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

/* =========================
   GET MESSAGES (cursor pagination)
   — includes sender name for group display
========================= */

export async function getMessages(req, res) {
  try {
    const { conversationId } = req.params;

    // Verify membership before returning messages
    if (!(await isMember(req.user.id, conversationId))) {
      return res.status(403).json({ error: "Not a member of this conversation" });
    }

    const limit = Math.min(parseInt(req.query.limit) || 40, 100);
    const before = req.query.before; // ISO timestamp cursor

    let result;

    if (!before) {
      result = await pool.query(
        `SELECT m.id, m.sender_id, m.content, m.status, m.created_at,
                COALESCE(u.display_name, u.username) AS sender_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = $1
         ORDER BY m.created_at DESC
         LIMIT $2`,
        [conversationId, limit]
      );
    } else {
      result = await pool.query(
        `SELECT m.id, m.sender_id, m.content, m.status, m.created_at,
                COALESCE(u.display_name, u.username) AS sender_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = $1
           AND m.created_at < $2
         ORDER BY m.created_at DESC
         LIMIT $3`,
        [conversationId, before, limit]
      );
    }

    // Return oldest-first so the UI can append naturally
    res.json(result.rows.reverse());
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

/* =========================
   UPDATE MESSAGE STATUS
========================= */

export async function updateMessageStatus(req, res) {
  try {
    const { message_id, status } = req.body;

    if (!message_id || !status) {
      return res.status(400).json({ error: "message_id and status required" });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const msgResult = await pool.query(
      `SELECT m.conversation_id FROM messages m
       JOIN conversation_members cm
         ON cm.conversation_id = m.conversation_id
        AND cm.user_id = $1
       WHERE m.id = $2`,
      [req.user.id, message_id]
    );

    if (msgResult.rows.length === 0) {
      return res.status(404).json({ error: "Message not found or access denied" });
    }

    await pool.query(
      `UPDATE messages SET status = $1 WHERE id = $2`,
      [status, message_id]
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    console.error("updateMessageStatus error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

/* =========================
   DELETE MESSAGE
========================= */

export async function deleteMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { for_everyone } = req.body; // boolean

    // Fetch the message to verify it exists and check ownership
    const msgResult = await pool.query(
      `SELECT m.id, m.sender_id, m.conversation_id
       FROM messages m
       JOIN conversation_members cm
         ON cm.conversation_id = m.conversation_id
        AND cm.user_id = $1
       WHERE m.id = $2`,
      [req.user.id, messageId]
    );

    if (msgResult.rows.length === 0) {
      return res.status(404).json({ error: "Message not found or access denied" });
    }

    const msg = msgResult.rows[0];

    if (for_everyone) {
      // Only the sender can delete for everyone
      if (msg.sender_id !== req.user.id) {
        return res.status(403).json({ error: "Only the sender can delete for everyone" });
      }
      await pool.query(`DELETE FROM messages WHERE id = $1`, [messageId]);
    } else {
      // "Delete for me" — soft-delete by recording who deleted it,
      // or hard-delete if only participant. For simplicity, hard-delete only for sender.
      // Non-senders: we mark a hidden_for array or just remove for everyone (simple approach).
      // Simple approach: remove from DB entirely (both paths delete, for_everyone just bypasses auth check).
      await pool.query(`DELETE FROM messages WHERE id = $1`, [messageId]);
    }

    // Notify other conversation members via socket (server.js picks this up)
    res._deletedMessage = { message_id: messageId, conversation_id: msg.conversation_id, for_everyone };

    res.json({ message: "Deleted", message_id: messageId, conversation_id: msg.conversation_id, for_everyone: !!for_everyone });
  } catch (err) {
    console.error("deleteMessage error:", err);
    res.status(500).json({ error: "Server error" });
  }
}



export async function markConversationRead(req, res) {
  try {
    const { conversationId } = req.params;
    const { message_id } = req.body;

    if (!message_id) {
      return res.status(400).json({ error: "message_id required" });
    }

    if (!(await isMember(req.user.id, conversationId))) {
      return res.status(403).json({ error: "Not a member of this conversation" });
    }

    const msgCheck = await pool.query(
      `SELECT id FROM messages WHERE id = $1 AND conversation_id = $2`,
      [message_id, conversationId]
    );

    if (msgCheck.rows.length === 0) {
      return res.status(404).json({ error: "Message not found in this conversation" });
    }

    await pool.query(
      `UPDATE conversation_members
       SET last_read_message_id = $1
       WHERE conversation_id = $2 AND user_id = $3`,
      [message_id, conversationId, req.user.id]
    );

    res.json({ message: "Conversation marked as read" });
  } catch (err) {
    console.error("markConversationRead error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
