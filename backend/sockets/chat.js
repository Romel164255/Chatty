const messageController = require("../controllers/messageController");
const rateLimit = require("../middleware/rateLimiter");

const setupChat = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected");

    socket.on("join_room", async (roomId) => {
      socket.join(roomId);

      const messages =
        await messageController.fetchRoomMessages(roomId);

      socket.emit("load_messages", messages);
    });

    socket.on("send_message", async (data) => {
      try {
        await rateLimit(data.sender);

        const savedMessage =
          await messageController.createMessage(data);

        io.to(data.roomId).emit(
          "receive_message",
          savedMessage
        );
      } catch (err) {
        socket.emit("error_message", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};

module.exports = setupChat;