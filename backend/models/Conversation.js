const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String, trim: true }, // only for groups
    avatar: { type: String, default: "" },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // only for groups
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
