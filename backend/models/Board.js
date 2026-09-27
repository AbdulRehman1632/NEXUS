const mongoose = require("mongoose");

// Definition of a custom field/column on a board's table (like ClickUp custom fields)
const customFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // internal key, e.g. "priority"
    label: { type: String, required: true }, // display label, e.g. "Priority"
    type: {
      type: String,
      enum: ["text", "number", "date", "select", "multiselect", "checkbox", "user", "url", "email", "currency"],
      default: "text",
    },
    options: [{ label: String, value: String, color: String }], // for select/multiselect
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

// A status/list column (like ClickUp statuses: To Do, In Progress, Done)
const statusSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    color: { type: String, default: "#7B68EE" },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const boardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    color: { type: String, default: "#7B68EE" },
    icon: { type: String, default: "📋" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        accessLevel: { type: String, enum: ["viewer", "editor"], default: "editor" },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    customFields: [customFieldSchema],
    statuses: {
      type: [statusSchema],
      default: [
        { name: "To Do", color: "#94A3B8", order: 0 },
        { name: "In Progress", color: "#3B82F6", order: 1 },
        { name: "Review", color: "#F59E0B", order: 2 },
        { name: "Done", color: "#22C55E", order: 3 },
      ],
    },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Board", boardSchema);
