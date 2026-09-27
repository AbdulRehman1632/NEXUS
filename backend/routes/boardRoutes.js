const express = require("express");
const asyncHandler = require("express-async-handler");
const Board = require("../models/Board");
const Card = require("../models/Card");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// Helper: does req.user have access to this board?
function hasAccess(board, user) {
  if (user.role === "admin") return true;
  return board.members.some((m) => m.user.toString() === user._id.toString());
}
function editLevel(board, user) {
  if (user.role === "admin") return "editor";
  const m = board.members.find((m) => m.user.toString() === user._id.toString());
  return m ? m.accessLevel : null;
}

// GET /api/boards - admin sees all boards, user sees only boards they've been granted
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const query =
      req.user.role === "admin"
        ? { archived: false }
        : { archived: false, "members.user": req.user._id };
    const boards = await Board.find(query)
      .populate("createdBy", "name email avatar")
      .populate("members.user", "name email avatar")
      .sort({ createdAt: -1 });
    res.json(boards);
  })
);

// POST /api/boards - admin creates a new board
router.post(
  "/",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { name, description, color, icon, customFields } = req.body;
    if (!name) {
      res.status(400);
      throw new Error("Board name is required");
    }
    const board = await Board.create({
      name,
      description,
      color,
      icon,
      customFields: customFields || [],
      createdBy: req.user._id,
      members: [{ user: req.user._id, accessLevel: "editor", addedBy: req.user._id }],
    });
    res.status(201).json(board);
  })
);

// GET /api/boards/:id
router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const board = await Board.findById(req.params.id)
      .populate("createdBy", "name email avatar")
      .populate("members.user", "name email avatar");
    if (!board) {
      res.status(404);
      throw new Error("Board not found");
    }
    if (!hasAccess(board, req.user)) {
      res.status(403);
      throw new Error("You do not have access to this board");
    }
    res.json(board);
  })
);

// PATCH /api/boards/:id - update board meta (name, desc, color, statuses)
router.patch(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const board = await Board.findById(req.params.id);
    if (!board) {
      res.status(404);
      throw new Error("Board not found");
    }
    if (editLevel(board, req.user) !== "editor") {
      res.status(403);
      throw new Error("Editor access required");
    }
    const { name, description, color, icon, statuses } = req.body;
    if (name !== undefined) board.name = name;
    if (description !== undefined) board.description = description;
    if (color !== undefined) board.color = color;
    if (icon !== undefined) board.icon = icon;
    if (statuses !== undefined) board.statuses = statuses;
    await board.save();
    res.json(board);
  })
);

// DELETE /api/boards/:id - admin only, soft archive
router.delete(
  "/:id",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const board = await Board.findById(req.params.id);
    if (!board) {
      res.status(404);
      throw new Error("Board not found");
    }
    board.archived = true;
    await board.save();
    res.json({ message: "Board archived" });
  })
);

// ---------- Custom fields ----------

// POST /api/boards/:id/fields - add a custom field/column to the table
router.post(
  "/:id/fields",
  protect,
  asyncHandler(async (req, res) => {
    const board = await Board.findById(req.params.id);
    if (!board) {
      res.status(404);
      throw new Error("Board not found");
    }
    if (editLevel(board, req.user) !== "editor") {
      res.status(403);
      throw new Error("Editor access required");
    }
    const { key, label, type, options, required } = req.body;
    if (!key || !label) {
      res.status(400);
      throw new Error("Field key and label are required");
    }
    board.customFields.push({
      key,
      label,
      type: type || "text",
      options: options || [],
      required: !!required,
      order: board.customFields.length,
    });
    await board.save();
    res.status(201).json(board);
  })
);

// PATCH /api/boards/:id/fields/:fieldId
router.patch(
  "/:id/fields/:fieldId",
  protect,
  asyncHandler(async (req, res) => {
    const board = await Board.findById(req.params.id);
    if (!board) {
      res.status(404);
      throw new Error("Board not found");
    }
    if (editLevel(board, req.user) !== "editor") {
      res.status(403);
      throw new Error("Editor access required");
    }
    const field = board.customFields.id(req.params.fieldId);
    if (!field) {
      res.status(404);
      throw new Error("Field not found");
    }
    Object.assign(field, req.body);
    await board.save();
    res.json(board);
  })
);

// DELETE /api/boards/:id/fields/:fieldId
router.delete(
  "/:id/fields/:fieldId",
  protect,
  asyncHandler(async (req, res) => {
    const board = await Board.findById(req.params.id);
    if (!board) {
      res.status(404);
      throw new Error("Board not found");
    }
    if (editLevel(board, req.user) !== "editor") {
      res.status(403);
      throw new Error("Editor access required");
    }
    board.customFields.id(req.params.fieldId).deleteOne();
    await board.save();
    res.json(board);
  })
);

// ---------- Member / access management (admin grants access) ----------

// POST /api/boards/:id/members - admin grants a user access to this board
router.post(
  "/:id/members",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { userId, accessLevel } = req.body;
    const board = await Board.findById(req.params.id);
    if (!board) {
      res.status(404);
      throw new Error("Board not found");
    }
    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    const already = board.members.find((m) => m.user.toString() === userId);
    if (already) {
      already.accessLevel = accessLevel || already.accessLevel;
    } else {
      board.members.push({
        user: userId,
        accessLevel: accessLevel || "editor",
        addedBy: req.user._id,
      });
    }
    await board.save();

    // Reflect on the user's own boardAccess list too
    const idx = user.boardAccess.findIndex((b) => b.board.toString() === board._id.toString());
    if (idx >= 0) user.boardAccess[idx].accessLevel = accessLevel || "editor";
    else user.boardAccess.push({ board: board._id, accessLevel: accessLevel || "editor" });
    await user.save();

    const populated = await Board.findById(board._id).populate("members.user", "name email avatar");
    res.json(populated);
  })
);

// DELETE /api/boards/:id/members/:userId - admin revokes access
router.delete(
  "/:id/members/:userId",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const board = await Board.findById(req.params.id);
    if (!board) {
      res.status(404);
      throw new Error("Board not found");
    }
    board.members = board.members.filter((m) => m.user.toString() !== req.params.userId);
    await board.save();

    const user = await User.findById(req.params.userId);
    if (user) {
      user.boardAccess = user.boardAccess.filter((b) => b.board.toString() !== board._id.toString());
      await user.save();
    }
    res.json(board);
  })
);

module.exports = router;
