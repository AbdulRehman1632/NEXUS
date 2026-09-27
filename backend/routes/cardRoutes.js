const express = require("express");
const asyncHandler = require("express-async-handler");
const Card = require("../models/Card");
const Board = require("../models/Board");
const { protect } = require("../middleware/auth");

const router = express.Router();

async function assertAccess(boardId, user, needsEdit = false) {
  const board = await Board.findById(boardId);
  if (!board) {
    const err = new Error("Board not found");
    err.status = 404;
    throw err;
  }
  if (user.role === "admin") return board;
  const member = board.members.find((m) => m.user.toString() === user._id.toString());
  if (!member) {
    const err = new Error("You do not have access to this board");
    err.status = 403;
    throw err;
  }
  if (needsEdit && member.accessLevel !== "editor") {
    const err = new Error("Editor access required");
    err.status = 403;
    throw err;
  }
  return board;
}

// GET /api/cards/board/:boardId - all rows for a board's table
router.get(
  "/board/:boardId",
  protect,
  asyncHandler(async (req, res) => {
    await assertAccess(req.params.boardId, req.user, false);
    const cards = await Card.find({ board: req.params.boardId })
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email avatar")
      .sort({ order: 1, createdAt: 1 });
    res.json(cards);
  })
);

// POST /api/cards - create a new row
router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const { board, title, status, assignees, dueDate, priority, fieldValues } = req.body;
    await assertAccess(board, req.user, true);
    const count = await Card.countDocuments({ board });
    const card = await Card.create({
      board,
      title,
      status,
      assignees,
      dueDate,
      priority,
      fieldValues: fieldValues || {},
      order: count,
      createdBy: req.user._id,
    });
    res.status(201).json(card);
  })
);

// PATCH /api/cards/:id - update a row (title, status, fields, assignees...)
router.patch(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const card = await Card.findById(req.params.id);
    if (!card) {
      res.status(404);
      throw new Error("Card not found");
    }
    await assertAccess(card.board, req.user, true);

    const { title, status, assignees, dueDate, priority, fieldValues, order } = req.body;
    if (title !== undefined) card.title = title;
    if (status !== undefined) card.status = status;
    if (assignees !== undefined) card.assignees = assignees;
    if (dueDate !== undefined) card.dueDate = dueDate;
    if (priority !== undefined) card.priority = priority;
    if (order !== undefined) card.order = order;
    if (fieldValues !== undefined) {
      card.fieldValues = { ...card.fieldValues, ...fieldValues };
      card.markModified("fieldValues");
    }
    await card.save();
    res.json(card);
  })
);

// DELETE /api/cards/:id
router.delete(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const card = await Card.findById(req.params.id);
    if (!card) {
      res.status(404);
      throw new Error("Card not found");
    }
    await assertAccess(card.board, req.user, true);
    await card.deleteOne();
    res.json({ message: "Card deleted" });
  })
);

module.exports = router;
