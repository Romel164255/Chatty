const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");

router.get("/:roomId", async (req, res) => {
  const messages =
    await messageController.fetchRoomMessages(
      req.params.roomId
    );
  res.json(messages);
});

module.exports = router;