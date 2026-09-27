const express = require("express");
const asyncHandler = require("express-async-handler");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { protect } = require("../middleware/auth");

const router = express.Router();

// GET /api/messages/:conversationId
router.get(
  "/:conversationId",
  protect,
  asyncHandler(async (req, res) => {
    const convo = await Conversation.findById(req.params.conversationId);
    if (!convo || !convo.members.map(String).includes(req.user._id.toString())) {
      res.status(403);
      throw new Error("Not a member of this conversation");
    }
    const messages = await Message.find({ conversation: req.params.conversationId })
      .populate("sender", "name avatar")
      .sort({ createdAt: 1 });
    res.json(messages);
  })
);

// POST /api/messages - send a message (also emitted live via socket.io from the client)
router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const { conversation, content, type, callType, callStatus, callDurationSec } = req.body;
    const convo = await Conversation.findById(conversation);
    if (!convo || !convo.members.map(String).includes(req.user._id.toString())) {
      res.status(403);
      throw new Error("Not a member of this conversation");
    }
    const message = await Message.create({
      conversation,
      sender: req.user._id,
      type: type || "text",
      content,
      callType,
      callStatus,
      callDurationSec,
      readBy: [req.user._id],
    });
    convo.lastMessage = message._id;
    await convo.save();
    const populated = await message.populate("sender", "name avatar");
    res.status(201).json(populated);
  })
);

module.exports = router;
