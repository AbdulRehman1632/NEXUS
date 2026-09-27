const express = require("express");
const asyncHandler = require("express-async-handler");
const Conversation = require("../models/Conversation");
const { protect } = require("../middleware/auth");

const router = express.Router();

// GET /api/conversations - all conversations for the logged in user
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const conversations = await Conversation.find({ members: req.user._id })
      .populate("members", "name email avatar isOnline")
      .populate("groupAdmin", "name email avatar")
      .populate({ path: "lastMessage", populate: { path: "sender", select: "name avatar" } })
      .sort({ updatedAt: -1 });
    res.json(conversations);
  })
);

// POST /api/conversations/direct - get or create a 1:1 conversation
router.post(
  "/direct",
  protect,
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      res.status(400);
      throw new Error("userId is required");
    }
    let convo = await Conversation.findOne({
      isGroup: false,
      members: { $all: [req.user._id, userId], $size: 2 },
    });
    if (!convo) {
      convo = await Conversation.create({
        isGroup: false,
        members: [req.user._id, userId],
        createdBy: req.user._id,
      });
    }
    convo = await convo.populate("members", "name email avatar isOnline");
    res.status(201).json(convo);
  })
);

// POST /api/conversations/group - create a group with selected members
router.post(
  "/group",
  protect,
  asyncHandler(async (req, res) => {
    const { name, memberIds } = req.body;
    if (!name || !memberIds || memberIds.length < 1) {
      res.status(400);
      throw new Error("Group name and at least one member are required");
    }
    const members = Array.from(new Set([...memberIds, req.user._id.toString()]));
    const convo = await Conversation.create({
      isGroup: true,
      name,
      members,
      groupAdmin: req.user._id,
      createdBy: req.user._id,
    });
    const populated = await convo.populate("members", "name email avatar isOnline");
    res.status(201).json(populated);
  })
);

// PATCH /api/conversations/:id/members - group admin adds/removes members
router.patch(
  "/:id/members",
  protect,
  asyncHandler(async (req, res) => {
    const convo = await Conversation.findById(req.params.id);
    if (!convo || !convo.isGroup) {
      res.status(404);
      throw new Error("Group not found");
    }
    if (convo.groupAdmin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      res.status(403);
      throw new Error("Only the group admin can manage members");
    }
    const { add, remove } = req.body;
    if (add) convo.members = Array.from(new Set([...convo.members.map(String), ...add]));
    if (remove) convo.members = convo.members.filter((m) => !remove.includes(m.toString()));
    await convo.save();
    const populated = await convo.populate("members", "name email avatar isOnline");
    res.json(populated);
  })
);

module.exports = router;
