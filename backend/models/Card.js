const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: "Board", required: true, index: true },
    title: { type: String, required: true, trim: true },
    status: { type: String, default: "To Do" }, // matches Board.statuses[].name
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dueDate: { type: Date },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    // Dynamic custom field values, keyed by the Board customFields[].key
    // e.g. { budget: 5000, industry: "SaaS", contacted: true }
    fieldValues: { type: mongoose.Schema.Types.Mixed, default: {} },
    order: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Card", cardSchema);
