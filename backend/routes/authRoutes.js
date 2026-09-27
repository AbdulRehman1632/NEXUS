const express = require("express");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route POST /api/auth/signup
// The very first user to sign up becomes admin automatically.
// Every subsequent signup is a regular "user" — an admin must grant board access.
router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email and password are required");
    }

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400);
      throw new Error("An account with this email already exists");
    }

    const userCount = await User.countDocuments();
    const role = userCount === 0 ? "admin" : "user";

    const user = await User.create({ name, email, password, role });

    res.status(201).json({
      user: user.toSafeObject(),
      token: generateToken(user._id),
    });
  })
);

// @route POST /api/auth/login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      user.isOnline = true;
      await user.save();
      res.json({
        user: user.toSafeObject(),
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error("Invalid email or password");
    }
  })
);

// @route GET /api/auth/me
router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    res.json(req.user);
  })
);

module.exports = router;
