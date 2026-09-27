const express = require("express");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// GET /api/users - list all users (for chat "new conversation", assignees, etc.)
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("name email avatar role isOnline lastSeen")
      .sort({ name: 1 });
    res.json(users);
  })
);

// PATCH /api/users/:id/role - admin promotes/demotes a user
router.patch(
  "/:id/role",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!["admin", "user"].includes(role)) {
      res.status(400);
      throw new Error("Invalid role");
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    user.role = role;
    await user.save();
    res.json(user.toSafeObject());
  })
);

// DELETE /api/users/:id - admin removes a user
router.delete(
  "/:id",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    await user.deleteOne();
    res.json({ message: "User removed" });
  })
);

module.exports = router;
