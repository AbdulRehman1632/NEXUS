const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["text", "call_log"], default: "text" },
    content: { type: String, default: "" },
    // For call_log messages
    callType: { type: String, enum: ["voice", "video"] },
    callStatus: { type: String, enum: ["missed", "completed", "declined"] },
    callDurationSec: { type: Number, default: 0 },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
